import { useState, useCallback } from 'react';
import { runSyncEngine, SyncEngineResult } from '../../services/syncEngine';
import { GoogleDriveFolderConfig, GoogleSheetConfig, AppSettings } from '../../types';

export function useSyncEngine() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncEngineResult | null>(null);

  const executeSync = useCallback(
    async (
      accessToken: string | null,
      userEmail: string,
      driveConfig: GoogleDriveFolderConfig | null,
      sheetConfig: GoogleSheetConfig | null,
      settings: AppSettings
    ) => {
      setIsSyncing(true);
      try {
        const result = await runSyncEngine(
          accessToken,
          userEmail,
          driveConfig,
          sheetConfig,
          settings
        );
        setLastResult(result);
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  return {
    isSyncing,
    lastResult,
    executeSync,
  };
}
