export type OverallStatus = 'COMPLETED' | 'PENDING' | 'NOT STARTED' | 'UNSUBMITTED_MATCH';

export interface StatusTriad {
  driveUploaded: boolean;
  sheetUpdated: boolean;
  submitted: boolean;
}

/**
 * Core 3-Status Engine Logic
 * Determines overall compliance status based on Drive Uploaded, Sheet Updated, and Submitted flags.
 *
 * Rules:
 * - VERIFIED GREEN IF ALL 3 TICKED ('COMPLETED')
 * - MISSING RED IF NOTHING ACTION DONE (all 3 unticked) ('NOT STARTED')
 * - IF NOT SUBMITTED BUT DRIVE AND SHEET DONE NEW COLOUR ('UNSUBMITTED_MATCH')
 * - REMAINING STATES ARE 'PENDING'
 */
export function calculateOverallStatus(triad: StatusTriad): OverallStatus {
  const { driveUploaded, sheetUpdated, submitted } = triad;

  if (driveUploaded && sheetUpdated && submitted) {
    return 'COMPLETED';
  }

  if (!driveUploaded && !sheetUpdated && !submitted) {
    return 'NOT STARTED';
  }

  if (driveUploaded && sheetUpdated && !submitted) {
    return 'UNSUBMITTED_MATCH';
  }

  return 'PENDING';
}
