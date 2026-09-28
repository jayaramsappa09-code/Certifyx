import { DriveCertificateFile } from '../types';

/**
 * Extracts Google Drive Folder ID from a URL or raw ID string.
 * Examples:
 * - https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
 * - https://drive.google.com/drive/u/0/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs?usp=sharing
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
 */
export function extractDriveFolderId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  // If it's a bare alphanumeric ID (typically 20-50 chars long)
  if (/^[a-zA-Z0-9_-]{20,50}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Extracts a Google Drive File ID from various link formats:
 * - https://drive.google.com/file/d/1A2B3C.../view
 * - https://drive.google.com/open?id=1A2B3C...
 * - https://drive.google.com/uc?id=1A2B3C...
 * - https://docs.google.com/file/d/1A2B3C.../edit
 */
export function extractDriveFileIdFromUrl(url: string): string | null {
  if (!url) return null;
  const str = url.trim();

  // Pattern /file/d/<id>
  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern ?id=<id> or &id=<id>
  const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Pattern /d/<id>
  const dMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  return null;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
}

/**
 * Robust fetch helper with exponential backoff for transient Google API errors or rate-limits (429/500/503).
 */
async function fetchDriveWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let delay = 1000;
  
  // Timeout guardian helper
  const withTimeout = (promise: Promise<Response>, timeoutMs: number) => {
    return Promise.race([
      promise,
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Google Drive request timed out. Please check your internet connection.')), timeoutMs)
      )
    ]);
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 15s timeout per attempt is reasonable for metadata/create/copy operations
      const res = await withTimeout(fetch(url, options), 15000);
      
      if (res.status === 429 || res.status >= 500) {
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  return fetch(url, options);
}

/**
 * Get folder metadata by ID
 */
export async function getDriveFolderMetadata(
  folderId: string,
  accessToken: string
): Promise<DriveFolderInfo> {
  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,modifiedTime&supportsAllDrives=true`;
  const res = await fetchDriveWithRetry(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Google authorization expired or invalid. Please re-authenticate.');
    }
    if (res.status === 404) {
      throw new Error(`Drive folder with ID "${folderId}" was not found or you don't have access.`);
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to fetch Drive folder info (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    modifiedTime: data.modifiedTime,
  };
}

/**
 * List top folders in user's Drive so they can pick one
 */
export async function listDriveFolders(
  accessToken: string,
  pageSize = 25
): Promise<DriveFolderInfo[]> {
  const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await fetchDriveWithRetry(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to list Drive folders (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Search all files across the entire Drive with full-text search and optional mimeType filter.
 */
export async function searchAllDriveFiles(
  query: string,
  accessToken: string,
  mimeType?: string
): Promise<DriveCertificateFile[]> {
  const files: DriveCertificateFile[] = [];
  let pageToken: string | null = null;

  // Build query: full-text search + optional mimeType filter
  let q = `fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`;
  if (mimeType) {
    q += ` and mimeType = '${mimeType}'`;
  }

  do {
    const params = new URLSearchParams({
      q: q,
      pageSize: '100',
      fields:
        'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,size,parents)',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const res = await fetchDriveWithRetry(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Google authorization expired or invalid. Please re-authenticate.');
      }
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Failed to search Drive files (${res.status})`);
    }

    const data = await res.json();
    if (data.files && Array.isArray(data.files)) {
      for (const item of data.files) {
        // Exclude folders from file search results
        if (item.mimeType === 'application/vnd.google-apps.folder') continue;

        files.push({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          createdTime: item.createdTime,
          modifiedTime: item.modifiedTime,
          webViewLink: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
          webContentLink: item.webContentLink,
          thumbnailLink: item.thumbnailLink,
          iconLink: item.iconLink,
          size: item.size,
        });
      }
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return files;
}

/**
 * List all certificate files in a specified folder (recursively scanning all nested subfolders and shortcuts).
 */
export async function listCertificateFilesInFolder(
  folderId: string,
  accessToken: string,
  onProgress?: (progress: { filesFound: number; currentFolder: string; page: number }) => void
): Promise<DriveCertificateFile[]> {
  const files: DriveCertificateFile[] = [];
  const visitedFolders = new Set<string>();
  const foldersToScan: Array<{ id: string; name: string }> = [];

  // Attempt to get root folder name
  try {
    const rootMeta = await getDriveFolderMetadata(folderId, accessToken);
    foldersToScan.push({ id: rootMeta.id, name: rootMeta.name });
  } catch {
    foldersToScan.push({ id: folderId, name: 'Root Folder' });
  }

  while (foldersToScan.length > 0) {
    const current = foldersToScan.shift()!;
    if (visitedFolders.has(current.id)) continue;
    visitedFolders.add(current.id);

    let pageToken: string | null = null;
    // Query for all files and folders inside this parent folder, excluding trashed
    const query = `'${current.id}' in parents and trashed = false`;

    do {
      const params = new URLSearchParams({
        q: query,
        pageSize: '100',
        fields:
          'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,size,parents,shortcutDetails)',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });

      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
      const res = await fetchDriveWithRetry(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Google authorization expired or invalid. Please re-authenticate.');
        }
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error?.message || `Failed to scan files in folder "${current.name}" (${res.status})`
        );
      }

      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        for (const item of data.files) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            // Queue nested subfolder to scan with its folder name
            if (!visitedFolders.has(item.id)) {
              foldersToScan.push({ id: item.id, name: item.name });
            }
          } else if (item.mimeType === 'application/vnd.google-apps.shortcut') {
            // Handle Google Drive shortcuts
            const targetMime = item.shortcutDetails?.targetMimeType;
            const targetId = item.shortcutDetails?.targetId;
            if (targetId) {
              if (targetMime === 'application/vnd.google-apps.folder') {
                if (!visitedFolders.has(targetId)) {
                  foldersToScan.push({ id: targetId, name: item.name });
                }
              } else {
                files.push({
                  id: targetId,
                  name: item.name,
                  mimeType: targetMime || 'application/octet-stream',
                  createdTime: item.createdTime,
                  modifiedTime: item.modifiedTime,
                  webViewLink: `https://drive.google.com/file/d/${targetId}/view`,
                  parentFolderName: current.name,
                  parentFolderId: current.id,
                });
              }
            }
          } else {
            // All certificate files (PDFs, images, docx, scans, etc.)
            files.push({
              id: item.id,
              name: item.name,
              mimeType: item.mimeType,
              createdTime: item.createdTime,
              modifiedTime: item.modifiedTime,
              webViewLink: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
              webContentLink: item.webContentLink,
              thumbnailLink: item.thumbnailLink,
              iconLink: item.iconLink,
              size: item.size,
              parentFolderName: current.name,
              parentFolderId: current.id,
            });
          }
        }
      }

      pageToken = data.nextPageToken || null;
      if (onProgress) {
        onProgress({
          filesFound: files.length,
          currentFolder: current.name,
          page: visitedFolders.size,
        });
      }
    } while (pageToken);
  }

  return files;
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(
  name: string,
  accessToken: string,
  parentId?: string
): Promise<DriveFolderInfo> {
  const url = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true`;
  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    body.parents = [parentId];
  }

  const res = await fetchDriveWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to create folder "${name}" (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
  };
}

/**
 * Copy a file to a specific folder in Google Drive
 */
export async function copyDriveFile(
  fileId: string,
  accessToken: string,
  targetFolderId: string,
  newName?: string
): Promise<{ id: string; name: string }> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/copy?supportsAllDrives=true`;
  const body: any = {
    parents: [targetFolderId],
  };
  if (newName) {
    body.name = newName;
  }

  const res = await fetchDriveWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to copy file ID "${fileId}" (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
  };
}
