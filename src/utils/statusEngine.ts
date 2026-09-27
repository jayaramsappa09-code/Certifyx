export type OverallStatus = 'COMPLETED' | 'PENDING' | 'NOT STARTED';

export interface StatusTriad {
  driveUploaded: boolean;
  sheetUpdated: boolean;
  submitted: boolean;
}

/**
 * Core 3-Status Engine Logic
 * Determines overall compliance status based on Drive Uploaded, Sheet Updated, and Submitted flags.
 */
export function calculateOverallStatus(triad: StatusTriad): OverallStatus {
  const { driveUploaded, sheetUpdated, submitted } = triad;

  if (driveUploaded && sheetUpdated && submitted) {
    return 'COMPLETED';
  }

  if (!driveUploaded && !sheetUpdated && !submitted) {
    return 'NOT STARTED';
  }

  return 'PENDING';
}
