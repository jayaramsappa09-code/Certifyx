import { useState, useCallback } from 'react';
import { Student } from '../../types';
import {
  addRosterStudent,
  batchAddRosterStudents,
  editRosterStudent,
  deleteRosterStudent,
} from '../../data/classRoster';

export function useRosterManager() {
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);

  const handleAddStudent = useCallback((student: Student) => {
    addRosterStudent(student);
  }, []);

  const handleBatchAddStudents = useCallback((students: Student[]) => {
    batchAddRosterStudents(students);
  }, []);

  const handleEditStudent = useCallback((rollNo: string, updatedName: string, updatedEmail?: string, updatedPhone?: string) => {
    editRosterStudent(rollNo, updatedName, updatedEmail, updatedPhone);
  }, []);

  const handleDeleteStudent = useCallback((rollNo: string) => {
    deleteRosterStudent(rollNo);
  }, []);

  return {
    showRosterModal,
    setShowRosterModal,
    showBatchImportModal,
    setShowBatchImportModal,
    handleAddStudent,
    handleBatchAddStudents,
    handleEditStudent,
    handleDeleteStudent,
  };
}
