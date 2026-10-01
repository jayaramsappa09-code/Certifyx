package com.example.certifyx.viewmodel

import androidx.lifecycle.ViewModel
import com.example.certifyx.data.AppRepository
import com.example.certifyx.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class AppTab {
    DASHBOARD, STUDENTS, GOOGLE_INTEGRATION, RECONCILIATION, MANUAL_REVIEW, EXPORT, AUDIT_LOGS, SETTINGS
}

data class UiState(
    val currentTab: AppTab = AppTab.DASHBOARD,
    val students: List<StudentStatusRecord> = emptyList(),
    val auditLogs: List<AuditLogEntry> = emptyList(),
    val syncReports: List<SyncReport> = emptyList(),
    val appSettings: AppSettings = AppSettings(),
    val reconciliationAnalysis: ReconciliationAnalysis? = null,
    val searchQuery: String = "",
    val statusFilter: String = "ALL", // ALL, COMPLETED, PENDING, NOT STARTED
    val selectedStudent: StudentStatusRecord? = null,
    val isSyncing: Boolean = false,
    val lastSyncReport: SyncReport? = null,
    val snackbarMessage: String? = null
)

class MainViewModel : ViewModel() {
    private val repository = AppRepository()

    private val _uiState = MutableStateFlow(
        UiState(
            students = repository.getStudents(),
            auditLogs = repository.getAuditLogs(),
            syncReports = repository.getSyncReports(),
            appSettings = repository.getAppSettings(),
            reconciliationAnalysis = repository.getReconciliationAnalysis(),
            lastSyncReport = repository.getSyncReports().firstOrNull()
        )
    )
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun setTab(tab: AppTab) {
        _uiState.update { it.copy(currentTab = tab) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun setStatusFilter(filter: String) {
        _uiState.update { it.copy(statusFilter = filter) }
    }

    fun selectStudent(student: StudentStatusRecord?) {
        _uiState.update { it.copy(selectedStudent = student) }
    }

    fun toggleStudentField(rollNo: String, field: String, value: Boolean) {
        repository.toggleStudentField(rollNo, field, value)
        refreshData("Updated status for $rollNo")
    }

    fun runSync() {
        _uiState.update { it.copy(isSyncing = true, snackbarMessage = "Running synchronization engine...") }
        val report = repository.runSync()
        refreshData("Synchronization completed successfully!")
        _uiState.update { it.copy(isSyncing = false, lastSyncReport = report) }
    }

    fun updateSettings(newSettings: AppSettings) {
        repository.updateAppSettings(newSettings)
        refreshData("Settings updated successfully")
    }

    val totalStudentsCount: Int
        get() = _uiState.value.students.size

    val completedCount: Int
        get() = _uiState.value.students.count { it.overallStatus == "COMPLETED" }

    val pendingCount: Int
        get() = _uiState.value.students.count { it.overallStatus == "PENDING" }

    val notStartedCount: Int
        get() = _uiState.value.students.count { it.overallStatus == "NOT STARTED" }

    fun clearSnackbar() {
        _uiState.update { it.copy(snackbarMessage = null) }
    }

    private fun refreshData(message: String) {
        _uiState.update {
            it.copy(
                students = repository.getStudents(),
                auditLogs = repository.getAuditLogs(),
                syncReports = repository.getSyncReports(),
                appSettings = repository.getAppSettings(),
                reconciliationAnalysis = repository.getReconciliationAnalysis(),
                snackbarMessage = message
            )
        }
    }
}
