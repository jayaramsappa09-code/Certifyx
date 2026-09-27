import { useState, useMemo } from 'react';
import { StudentStatusRecord, DateRangeFilterConfig, FilterType } from '../types';
import { isStudentMatchingDateRange } from '../utils/dateFilterUtils';

export type SortField = 'rollNo' | 'name' | 'overallStatus' | 'driveUploaded' | 'sheetUpdated' | 'submitted';
export type SortOrder = 'asc' | 'desc';

interface UseStudentTableDataProps {
  students: StudentStatusRecord[];
  activeFilter: FilterType;
  dateFilterConfig?: DateRangeFilterConfig;
}

export function useStudentTableData({
  students,
  activeFilter,
  dateFilterConfig,
}: UseStudentTableDataProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rollNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedRollNos, setSelectedRollNos] = useState<Set<string>>(new Set());

  // 1. Date Range Filtering
  const dateFilteredStudents = useMemo(() => {
    if (!dateFilterConfig) return students;
    return students.filter((s) => isStudentMatchingDateRange(s, dateFilterConfig));
  }, [students, dateFilterConfig]);

  // 2. Status Category Filtering
  const categoryFilteredStudents = useMemo(() => {
    return dateFilteredStudents.filter((student) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'COMPLETED') return student.overallStatus === 'COMPLETED';
      if (activeFilter === 'PENDING') return student.overallStatus === 'PENDING';
      if (activeFilter === 'NOT_STARTED') return student.overallStatus === 'NOT STARTED';
      if (activeFilter === 'DRIVE_ONLY') return student.driveUploaded && !student.sheetUpdated;
      if (activeFilter === 'SHEET_ONLY') return student.sheetUpdated && !student.driveUploaded;
      if (activeFilter === 'MISMATCH') return Boolean(student.countMismatch?.hasMismatch);
      return true;
    });
  }, [dateFilteredStudents, activeFilter]);

  // 3. Search Query Filtering
  const searchFilteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return categoryFilteredStudents;
    const q = searchQuery.toLowerCase().trim();
    return categoryFilteredStudents.filter((student) => {
      const matchRoll = student.rollNo.toLowerCase().includes(q);
      const matchName = student.name.toLowerCase().includes(q);
      const matchEmail = (student.email || '').toLowerCase().includes(q);
      const matchCert = student.certificates.some((c) => c.toLowerCase().includes(q));
      return matchRoll || matchName || matchEmail || matchCert;
    });
  }, [categoryFilteredStudents, searchQuery]);

  // 4. Sorting
  const sortedStudents = useMemo(() => {
    return [...searchFilteredStudents].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchFilteredStudents, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedRollNos.size === sortedStudents.length) {
      setSelectedRollNos(new Set());
    } else {
      setSelectedRollNos(new Set(sortedStudents.map((s) => s.rollNo)));
    }
  };

  const toggleSelectStudent = (rollNo: string) => {
    const next = new Set(selectedRollNos);
    if (next.has(rollNo)) next.delete(rollNo);
    else next.add(rollNo);
    setSelectedRollNos(next);
  };

  return {
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
    selectedRollNos,
    setSelectedRollNos,
    toggleSelectAll,
    toggleSelectStudent,
    sortedStudents,
  };
}
