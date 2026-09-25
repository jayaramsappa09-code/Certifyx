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
  // If it's a bare alphanumeric ID (typically 25-45 chars long)
  if (/^[a-zA-Z0-9_-]{20,50}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
}

/**
 * Get folder metadata by ID
 */
export async function getDriveFolderMetadata(
  folderId: string,
  accessToken: string
): Promise<DriveFolderInfo> {
  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,modifiedTime&supportsAllDrives=true`;
  const res = await fetch(url, {
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
  pageSize = 20
): Promise<DriveFolderInfo[]> {
  const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await fetch(url, {
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
 * List all certificate files in a specified folder.
 * Uses pagination to read all files safely and efficiently.
 * Supported file types: PDF, JPG, JPEG, PNG, WebP
 */
export async function listCertificateFilesInFolder(
  folderId: string,
  accessToken: string
): Promise<DriveCertificateFile[]> {
  const files: DriveCertificateFile[] = [];
  let pageToken: string | null = null;

  // Filter for valid certificate mime types & trashed=false
  // mimeType = 'application/pdf' or mimeType contains 'image/'
  const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType = 'image/jpeg' or mimeType = 'image/png' or mimeType = 'image/webp')`;

  do {
    const params = new URLSearchParams({
      q: query,
      pageSize: '100',
      fields: 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,size)',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const res = await fetch(url, {
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
        errBody.error?.message || `Failed to fetch files in folder "${folderId}" (${res.status})`
      );
    }

    const data = await res.json();
    if (data.files && Array.isArray(data.files)) {
      for (const item of data.files) {
        files.push({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          createdTime: item.createdTime,
          modifiedTime: item.modifiedTime,
          webViewLink: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
          webContentLink: item.webContentLink,
          size: item.size,
        });
      }
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return files;
}
