package com.example.certifyx.model

data class Student(
    val rollNo: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null
)

data class DriveCertificateFile(
    val id: String,
    val name: String,
    val mimeType: String,
    val createdTime: String? = null,
    val modifiedTime: String? = null,
    val webViewLink: String? = null,
    val detectedRollNo: String? = null,
    val detectedCertType: String? = null,
    val detectedStudentName: String? = null,
    val isOutsideClass: Boolean = false,
    val isUnidentified: Boolean = false
)

data class SheetRowRecord(
    val rowIndex: Int,
    val rollNo: String,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val certificateType: String? = null,
    val submissionTimestamp: String? = null,
    val matchStatus: String = "MATCHED" // MATCHED, OUTSIDE_CLASS, UNMATCHED_ROLL
)

data class CountMismatchInfo(
    val hasMismatch: Boolean,
    val driveCount: Int,
    val sheetCount: Int,
    val difference: Int,
    val type: String, // MORE_IN_SHEET, MORE_IN_DRIVE, EQUAL
    val description: String
)

data class StudentStatusRecord(
    val rollNo: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val certificates: List<String> = emptyList(),
    var driveUploaded: Boolean = false,
    var sheetUpdated: Boolean = false,
    var submitted: Boolean = false,
    var overallStatus: String = "NOT STARTED", // COMPLETED, PENDING, NOT STARTED
    var countMismatch: CountMismatchInfo? = null,
    val driveFiles: MutableList<DriveCertificateFile> = mutableListOf(),
    val sheetRecords: MutableList<SheetRowRecord> = mutableListOf(),
    var lastUpdated: String? = null
)

data class ReconciliationAnalysis(
    val timestamp: String,
    val totalRosterStudents: Int,
    val totalSheetRowsScanned: Int,
    val totalDriveFilesScanned: Int,
    val rosterMissingInSheet: List<Map<String, Any>>,
    val sheetMissingInRoster: List<Map<String, Any>>,
    val driveMissingInSheet: List<Map<String, Any>>,
    val sheetMissingInDrive: List<Map<String, Any>>,
    val quantityMismatches: List<Map<String, Any>>,
    val summary: ReconciliationSummary
)

data class ReconciliationSummary(
    val matchedRosterCount: Int,
    val rosterMissingSheetCount: Int,
    val sheetOutsideRosterCount: Int,
    val outsideClassQuarantinedCount: Int,
    val strictRosterEnforced: Boolean,
    val driveMissingSheetCount: Int,
    val sheetMissingDriveCount: Int,
    val quantityMismatchCount: Int,
    val totalGapsCount: Int,
    val integrityScore: Int
)

data class SyncReport(
    val id: String,
    val timestamp: String,
    val studentsChecked: Int,
    val driveFilesScanned: Int,
    val matchedCertificates: Int,
    val studentsWithCertificates: Int,
    val spreadsheetRecordsChecked: Int,
    val spreadsheetMatches: Int,
    val outsideClassIgnored: Int,
    val unidentifiedFiles: Int,
    val errors: Int,
    val durationMs: Long
)

data class AuditLogEntry(
    val id: String,
    val timestamp: String,
    val action: String,
    val user: String,
    val details: String,
    val category: String
)

data class AppSettings(
    val autoSyncIntervalMinutes: Int = 15,
    val enableSpreadsheetWrite: Boolean = true,
    val adminEmails: List<String> = listOf("jayaramsappa09@gmail.com"),
    val theme: String = "dark",
    val driveFolderId: String = "root",
    val driveFolderName: String = "Class Certificates 2026",
    val spreadsheetId: String = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    val spreadsheetName: String = "Student Certificate Submissions (Responses)",
    val sheetName: String = "Form Responses 1"
)
