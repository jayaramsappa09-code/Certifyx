import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  StudentStatusRecord,
  GoogleDriveFolderConfig,
  GoogleSheetConfig,
  AppSettings,
  SyncReport,
  AuditLogEntry,
  AuthUser,
} from '../types';

export type FilterType =
  | 'ALL'
  | 'COMPLETED'
  | 'PENDING'
  | 'DRIVE_ONLY'
  | 'SHEET_ONLY'
  | 'MISMATCH'
  | 'NOT_STARTED'
  | 'UNIDENTIFIED'
  | 'OUTSIDE_CLASS';
import {
  getSavedDriveConfig,
  saveDriveConfig,
  getSavedSheetConfig,
  saveSheetConfig,
  getAppSettings,
  saveAppSettings,
  getSyncHistory,
  getAuditLogs,
  addAuditLog,
  getThemePreference,
  saveThemePreference,
} from '../services/storageService';
import { initAuth, logout } from '../services/firebaseAuth';
import { FIXED_CLASS_ROSTER } from '../data/classRoster';

interface AppContextType {
  currentUser: AuthUser | null;
  accessToken: string | null;
  studentStatuses: StudentStatusRecord[];
  setStudentStatuses: React.Dispatch<React.SetStateAction<StudentStatusRecord[]>>;
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  driveConfig: GoogleDriveFolderConfig | null;
  setDriveConfig: (config: GoogleDriveFolderConfig | null) => void;
  sheetConfig: GoogleSheetConfig | null;
  setSheetConfig: (config: GoogleSheetConfig | null) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  syncHistory: SyncReport[];
  setSyncHistory: React.Dispatch<React.SetStateAction<SyncReport[]>>;
  auditLogs: AuditLogEntry[];
  refreshAuditLogs: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  handleLogout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [studentStatuses, setStudentStatuses] = useState<StudentStatusRecord[]>(() =>
    FIXED_CLASS_ROSTER.map((s) => ({
      ...s,
      driveUploaded: false,
      sheetUpdated: false,
      submitted: false,
      overallStatus: 'NOT STARTED',
      certificates: [],
      driveFiles: [],
      sheetRecords: [],
    }))
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [driveConfig, setDriveConfigState] = useState<GoogleDriveFolderConfig | null>(getSavedDriveConfig());
  const [sheetConfig, setSheetConfigState] = useState<GoogleSheetConfig | null>(getSavedSheetConfig());
  const [settings, setSettingsState] = useState<AppSettings>(getAppSettings());
  const [syncHistory, setSyncHistory] = useState<SyncReport[]>(getSyncHistory());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(getAuditLogs());
  const [theme, setTheme] = useState<'dark' | 'light'>(getThemePreference());

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessTokenState(token);
      },
      () => {
        setCurrentUser(null);
        setAccessTokenState(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const setDriveConfig = useCallback((config: GoogleDriveFolderConfig | null) => {
    saveDriveConfig(config);
    setDriveConfigState(config);
  }, []);

  const setSheetConfig = useCallback((config: GoogleSheetConfig | null) => {
    saveSheetConfig(config);
    setSheetConfigState(config);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    const updated = saveAppSettings(newSettings);
    setSettingsState(updated);
  }, []);

  const refreshAuditLogs = useCallback(() => {
    setAuditLogs(getAuditLogs());
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    saveThemePreference(nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  const handleLogout = useCallback(async () => {
    await logout();
    setCurrentUser(null);
    setAccessTokenState(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        accessToken,
        studentStatuses,
        setStudentStatuses,
        activeFilter,
        setActiveFilter,
        isSyncing,
        setIsSyncing,
        driveConfig,
        setDriveConfig,
        sheetConfig,
        setSheetConfig,
        settings,
        updateSettings,
        syncHistory,
        setSyncHistory,
        auditLogs,
        refreshAuditLogs,
        theme,
        toggleTheme,
        handleLogout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
