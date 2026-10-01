package com.example.certifyx.data

import com.example.certifyx.model.*
import java.text.SimpleDateFormat
import java.util.*

class AppRepository {
    private val seedCertificates = mapOf(
        "25A31A05EN" to listOf("Participation", "Course", "Hackathon"),
        "25A31A05FT" to listOf("Participation", "Merit"),
        "25A31A05EI" to listOf("Participation"),
        "25A31A05EM" to listOf("Participation"),
        "25A31A05EH" to listOf("Course"),
        "25A31A05EA" to listOf("Participation", "Course"),
        "25A31A05EO" to listOf("Course", "Participation"),
        "25A31A05EV" to listOf("Course"),
        "25A31A05GF" to listOf("Participation"),
        "25A31A05ER" to listOf("Certificate of Participation", "Course"),
        "25A31A05EL" to listOf("Course"),
        "25A31A05EP" to listOf("Course"),
        "25A31A05DZ" to listOf("Course"),
        "25A31A05GD" to listOf("Participation"),
        "25A31A05EZ" to listOf("Participation", "Course"),
        "25A31A05DX" to listOf("Certification", "Participation"),
        "25A31A05GB" to listOf("Hackathon"),
        "25A31A05FW" to listOf("Hackathon", "Participation"),
        "25A31A05EY" to listOf("Hackathon", "Participation"),
        "25A31A05FA" to listOf("Hackathon"),
        "25A31A05GC" to listOf("Course", "Participation", "Award"),
        "25A31A05GE" to listOf("Course", "Participation", "Award")
    )

    private val studentsList = mutableListOf<StudentStatusRecord>().apply {
        ClassRosterData.FIXED_CLASS_ROSTER_STATIC.forEach { student ->
            val certs = seedCertificates[student.rollNo] ?: emptyList()
            val hasCerts = certs.isNotEmpty()
            val driveFiles = certs.mapIndexed { idx, cert ->
                DriveCertificateFile(
                    id = "file_${student.rollNo}_$idx",
                    name = "${student.rollNo}_${cert}.pdf",
                    mimeType = "application/pdf",
                    webViewLink = "https://drive.google.com/file/d/mock_${student.rollNo}_$idx",
                    detectedRollNo = student.rollNo,
                    detectedCertType = cert,
                    detectedStudentName = student.name
                )
            }.toMutableList()

            val sheetRecords = certs.mapIndexed { idx, cert ->
                SheetRowRecord(
                    rowIndex = idx + 2,
                    rollNo = student.rollNo,
                    name = student.name,
                    certificateType = cert,
                    submissionTimestamp = "2026-03-25T10:00:00Z",
                    matchStatus = "MATCHED"
                )
            }.toMutableList()

            val driveUploaded = hasCerts
            val sheetUpdated = hasCerts
            val submitted = hasCerts

            val overallStatus = when {
                driveUploaded && sheetUpdated -> "COMPLETED"
                driveUploaded || sheetUpdated -> "PENDING"
                else -> "NOT STARTED"
            }

            add(
                StudentStatusRecord(
                    rollNo = student.rollNo,
                    name = student.name,
                    certificates = certs,
                    driveUploaded = driveUploaded,
                    sheetUpdated = sheetUpdated,
                    submitted = submitted,
                    overallStatus = overallStatus,
                    driveFiles = driveFiles,
                    sheetRecords = sheetRecords,
                    lastUpdated = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date())
                )
            )
        }
    }

    private val auditLogs = mutableListOf(
        AuditLogEntry(
            id = "log_1",
            timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()),
            action = "INITIALIZE_SYSTEM",
            user = "jayaramsappa09@gmail.com",
            details = "Initialized Certifyx Android engine with 67 roster students.",
            category = "SYSTEM"
        )
    )

    private val syncReports = mutableListOf(
        SyncReport(
            id = "sync_1",
            timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()),
            studentsChecked = 67,
            driveFilesScanned = 42,
            matchedCertificates = 42,
            studentsWithCertificates = 22,
            spreadsheetRecordsChecked = 42,
            spreadsheetMatches = 42,
            outsideClassIgnored = 0,
            unidentifiedFiles = 0,
            errors = 0,
            durationMs = 384
        )
    )

    private var appSettings = AppSettings()

    fun getStudents(): List<StudentStatusRecord> = studentsList

    fun getAuditLogs(): List<AuditLogEntry> = auditLogs.toList()

    fun getSyncReports(): List<SyncReport> = syncReports.toList()

    fun getAppSettings(): AppSettings = appSettings

    fun updateAppSettings(newSettings: AppSettings) {
        appSettings = newSettings
        logAction("UPDATE_SETTINGS", "Updated application configuration settings.", "SETTINGS")
    }

    fun toggleStudentField(rollNo: String, field: String, value: Boolean) {
        val student = studentsList.find { it.rollNo == rollNo } ?: return
        when (field) {
            "submitted" -> student.submitted = value
            "driveUploaded" -> student.driveUploaded = value
            "sheetUpdated" -> student.sheetUpdated = value
        }
        student.overallStatus = when {
            student.driveUploaded && student.sheetUpdated -> "COMPLETED"
            student.driveUploaded || student.sheetUpdated -> "PENDING"
            else -> "NOT STARTED"
        }
        student.lastUpdated = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date())
        logAction("UPDATE_STATUS", "Updated $field for student $rollNo to $value", "STATUS")
    }

    fun runSync(): SyncReport {
        val startTime = System.currentTimeMillis()
        val totalDrive = studentsList.sumOf { it.driveFiles.size }
        val totalSheet = studentsList.sumOf { it.sheetRecords.size }
        val studentsWithCert = studentsList.count { it.driveFiles.isNotEmpty() || it.sheetRecords.isNotEmpty() }
        val duration = System.currentTimeMillis() - startTime + 250

        val report = SyncReport(
            id = "sync_${System.currentTimeMillis()}",
            timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()),
            studentsChecked = studentsList.size,
            driveFilesScanned = totalDrive,
            matchedCertificates = totalDrive,
            studentsWithCertificates = studentsWithCert,
            spreadsheetRecordsChecked = totalSheet,
            spreadsheetMatches = totalSheet,
            outsideClassIgnored = 0,
            unidentifiedFiles = 0,
            errors = 0,
            durationMs = duration
        )
        syncReports.add(0, report)
        logAction("RUN_SYNC", "Executed synchronization engine successfully. Scanned $totalDrive Drive files and $totalSheet Sheet rows.", "SYNC")
        return report
    }

    private fun logAction(action: String, details: String, category: String) {
        auditLogs.add(
            0,
            AuditLogEntry(
                id = "log_${System.currentTimeMillis()}",
                timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()),
                action = action,
                user = "jayaramsappa09@gmail.com",
                details = details,
                category = category
            )
        )
    }

    fun getReconciliationAnalysis(): ReconciliationAnalysis {
        val missingInSheet = studentsList.filter { it.driveFiles.isNotEmpty() && it.sheetRecords.isEmpty() }.map {
            mapOf("rollNo" to it.rollNo, "name" to it.name, "fileCount" to it.driveFiles.size)
        }
        val missingInDrive = studentsList.filter { it.sheetRecords.isNotEmpty() && it.driveFiles.isEmpty() }.map {
            mapOf("rollNo" to it.rollNo, "name" to it.name, "sheetCount" to it.sheetRecords.size)
        }
        val quantityMismatches = studentsList.filter { it.driveFiles.size != it.sheetRecords.size && it.driveFiles.isNotEmpty() && it.sheetRecords.isNotEmpty() }.map {
            mapOf(
                "rollNo" to it.rollNo,
                "name" to it.name,
                "driveCount" to it.driveFiles.size,
                "sheetCount" to it.sheetRecords.size,
                "difference" to kotlin.math.abs(it.driveFiles.size - it.sheetRecords.size)
            )
        }
        val matchedCount = studentsList.count { it.overallStatus == "COMPLETED" }
        val totalGaps = missingInSheet.size + missingInDrive.size + quantityMismatches.size
        val integrity = if (studentsList.isNotEmpty()) ((matchedCount * 100) / studentsList.size) else 100

        return ReconciliationAnalysis(
            timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()),
            totalRosterStudents = studentsList.size,
            totalSheetRowsScanned = studentsList.sumOf { it.sheetRecords.size },
            totalDriveFilesScanned = studentsList.sumOf { it.driveFiles.size },
            rosterMissingInSheet = emptyList(),
            sheetMissingInRoster = emptyList(),
            driveMissingInSheet = missingInSheet,
            sheetMissingInDrive = missingInDrive,
            quantityMismatches = quantityMismatches,
            summary = ReconciliationSummary(
                matchedRosterCount = matchedCount,
                rosterMissingSheetCount = 0,
                sheetOutsideRosterCount = 0,
                outsideClassQuarantinedCount = 0,
                strictRosterEnforced = true,
                driveMissingSheetCount = missingInSheet.size,
                sheetMissingDriveCount = missingInDrive.size,
                quantityMismatchCount = quantityMismatches.size,
                totalGapsCount = totalGaps,
                integrityScore = integrity
            )
        )
    }
}
