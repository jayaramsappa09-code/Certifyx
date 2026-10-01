package com.example.certifyx.viewmodel

import androidx.lifecycle.ViewModel
import com.example.certifyx.data.AppRepository
import com.example.certifyx.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class AppTab {
    DASHBOARD, STUDENTS, BROADCAST_ALERTS, STUDENT_PORTAL, GOOGLE_INTEGRATION, RECONCILIATION, MANUAL_REVIEW, EXPORT, AUDIT_LOGS, SETTINGS
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
    val notifications: List<StudentNotification> = emptyList(),
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
            notifications = repository.getAllNotifications(),
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

    fun uploadStudentCertificate(
        rollNo: String,
        studentName: String,
        certType: String,
        certTitle: String,
        fileName: String
    ): Boolean {
        val success = repository.uploadStudentCertificate(
            rollNo = rollNo,
            studentName = studentName,
            certType = certType,
            certTitle = certTitle,
            fileName = fileName
        )
        if (success) {
            refreshData("Successfully uploaded $fileName to Google Drive folder '${repository.getAppSettings().driveFolderName}' and updated Google Sheets!")
        }
        return success
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

    val rejectedCount: Int
        get() = _uiState.value.students.count { it.approvalStatus == "REJECTED" }

    val approvedCount: Int
        get() = _uiState.value.students.count { it.approvalStatus == "APPROVED" }

    fun broadcastAlertToGroup(
        targetGroup: String,
        title: String,
        message: String,
        priority: String,
        sender: String = "Faculty Coordinator"
    ): Int {
        val count = repository.broadcastAlertToGroup(targetGroup, title, message, priority, sender)
        refreshData("Broadcast alert successfully sent to $count students' apps!")
        return count
    }

    fun approveStudent(rollNo: String) {
        repository.approveStudent(rollNo)
        refreshData("Certificate approved for $rollNo")
    }

    fun rejectStudent(rollNo: String, reason: String) {
        repository.rejectStudent(rollNo, reason)
        refreshData("Re-upload requested for $rollNo: $reason")
    }

    fun getDefaulters(): List<StudentStatusRecord> {
        return repository.getDefaulters()
    }

    fun generateWhatsAppReminderMessage(): String {
        val defaulters = getDefaulters()
        val count = defaulters.size
        val rollPreview = defaulters.take(10).joinToString(", ") { it.rollNo }
        val more = if (count > 10) " and ${count - 10} others" else ""
        return """
📢 *URGENT CERTIFICATE SUBMISSION REMINDER* 📢
Dear Students,
Please upload your Hackathon/Course/Activity certificates on *Certifyx* for NAAC & Accreditation records immediately.

*Pending Roll Numbers ($count students)*:
$rollPreview$more

👉 Please submit your PDF certificate directly via Certifyx Portal. Ensure your Roll Number matches.
""".trimIndent()
    }

    fun importRosterCsv(csvText: String, sectionName: String): Int {
        val lines = csvText.lines().map { it.trim() }.filter { it.isNotBlank() }
        val newStudents = mutableListOf<Student>()
        lines.forEach { line ->
            val parts = line.split(",", "\t", ";").map { it.trim() }
            if (parts.size >= 2) {
                val roll = parts[0]
                val name = parts[1]
                if (roll.isNotBlank() && name.isNotBlank() && !roll.equals("RollNo", ignoreCase = true)) {
                    newStudents.add(Student(rollNo = roll, name = name))
                }
            }
        }
        if (newStudents.isNotEmpty()) {
            repository.importRoster(newStudents, sectionName)
            refreshData("Successfully imported ${newStudents.size} students into $sectionName!")
        }
        return newStudents.size
    }

    fun sendNotificationToStudent(
        rollNo: String,
        title: String,
        message: String,
        type: String = "NOTICE",
        sender: String = "Faculty Coordinator"
    ) {
        repository.sendNotification(rollNo, title, message, type, sender)
        refreshData("Notification sent to $rollNo")
    }

    fun broadcastNotificationToDefaulters(title: String, message: String): Int {
        val count = repository.broadcastNotificationToDefaulters(title, message)
        refreshData("Urgent reminder sent to $count pending students' apps!")
        return count
    }

    fun getNotificationsForStudent(rollNo: String): List<StudentNotification> {
        return repository.getNotificationsForStudent(rollNo)
    }

    fun markNotificationAsRead(id: String) {
        repository.markNotificationAsRead(id)
        refreshData("")
    }

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
                notifications = repository.getAllNotifications(),
                snackbarMessage = if (message.isNotBlank()) message else it.snackbarMessage
            )
        }
    }
}
