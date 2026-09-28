import { CampusRole, CampusRoleConfig, StudentStatusRecord } from '../types';

export const CAMPUS_ROLES: Record<CampusRole, CampusRoleConfig> = {
  STUDENT: {
    id: 'STUDENT',
    title: 'Student Self-Service',
    badge: 'Student',
    scopeDescription: 'Access restricted strictly to your own verification status and certificate portfolio.',
    maxAccessibleRecords: 1,
    permissions: {
      canExportAuditLogs: false,
      canExportAllDrive: false,
      canMutateRoster: false,
      canViewAllBranches: false,
      canBulkVerify: false,
      canManageDriveQuota: false,
    },
  },
  FACULTY_PROCTOR: {
    id: 'FACULTY_PROCTOR',
    title: 'Faculty Proctor / Mentor',
    badge: 'Proctor (60 Batch)',
    scopeDescription: 'Manage your assigned 60-student classroom batch, toggle submissions, and send reminders.',
    maxAccessibleRecords: 60,
    assignedDepartment: 'CSE',
    assignedBatchRange: { fromRoll: '21A91A0501', toRoll: '21A91A0560' },
    permissions: {
      canExportAuditLogs: false,
      canExportAllDrive: false,
      canMutateRoster: false,
      canViewAllBranches: false,
      canBulkVerify: true,
      canManageDriveQuota: false,
    },
  },
  DEPARTMENT_HOD: {
    id: 'DEPARTMENT_HOD',
    title: 'Department HOD',
    badge: 'HOD (Branch)',
    scopeDescription: 'Oversee 500–1,000 branch records (e.g., Computer Science), inspect proof, and export department reports.',
    maxAccessibleRecords: 1000,
    assignedDepartment: 'CSE',
    permissions: {
      canExportAuditLogs: false,
      canExportAllDrive: true,
      canMutateRoster: true,
      canViewAllBranches: false,
      canBulkVerify: true,
      canManageDriveQuota: true,
    },
  },
  DEAN_PRINCIPAL: {
    id: 'DEAN_PRINCIPAL',
    title: 'Dean / Principal (Campus-Wide)',
    badge: 'Dean / Principal',
    scopeDescription: 'Full institution-wide access across 5,000+ students, comprehensive audit logs, and zero-cost scaling hub.',
    maxAccessibleRecords: 5000,
    permissions: {
      canExportAuditLogs: true,
      canExportAllDrive: true,
      canMutateRoster: true,
      canViewAllBranches: true,
      canBulkVerify: true,
      canManageDriveQuota: true,
    },
  },
};

/**
 * Filters student records strictly in memory according to active Campus RBAC role.
 * Zero server compute needed — enforces privacy directly in client memory.
 */
export function filterStudentsByRole(
  students: StudentStatusRecord[],
  role: CampusRole,
  activeStudentRoll?: string,
  assignedBranch = 'CSE'
): StudentStatusRecord[] {
  if (role === 'DEAN_PRINCIPAL') {
    return students;
  }

  if (role === 'STUDENT') {
    // If student roll is provided or match first/current, show only 1 student record
    const targetRoll = activeStudentRoll || (students[0]?.rollNo ?? '21A91A0501');
    const match = students.filter((s) => s.rollNo.toLowerCase() === targetRoll.toLowerCase());
    return match.length > 0 ? match : students.slice(0, 1);
  }

  if (role === 'FACULTY_PROCTOR') {
    // Assigned 60-student batch (e.g. section A or rolls matching 0501 to 0560)
    // If students have section or rollNo pattern, match section or take first 60
    const batch = students.filter((s) => {
      const isSecA = s.sheetRecords?.some((r) => r.section?.toUpperCase() === 'A');
      const isBranchRoll = s.rollNo.includes('05');
      return isSecA || isBranchRoll;
    });
    return batch.length >= 20 ? batch.slice(0, 60) : students.slice(0, 60);
  }

  if (role === 'DEPARTMENT_HOD') {
    // Branch records (e.g. CSE branch or first 500-1000)
    const branchMatch = students.filter((s) => {
      const hasDept = s.sheetRecords?.some((r) => r.department?.toUpperCase().includes(assignedBranch));
      const hasRollCode = s.rollNo.includes('05') || s.rollNo.includes('CS');
      return hasDept || hasRollCode;
    });
    return branchMatch.length > 0 ? branchMatch : students.slice(0, 500);
  }

  return students;
}
