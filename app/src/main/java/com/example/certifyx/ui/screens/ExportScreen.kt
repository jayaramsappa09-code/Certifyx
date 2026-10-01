package com.example.certifyx.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@Composable
fun ExportScreen(state: UiState, viewModel: MainViewModel) {
    val context = LocalContext.current
    var showNaacPreviewDialog by remember { mutableStateOf(false) }
    var exportFeedbackText by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.FileDownload, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = "Accreditation & Export Center", style = MaterialTheme.typography.titleLarge)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = "Download audit-ready reports formatted for NAAC Criteria 5 (Student Progression), NBA criteria, and institutional CSV rosters.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // Institutional Accreditation Exports
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.School, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Institutional Accreditation Reports",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Generates formatted tables mapping student roll numbers, certificate categories, event names, and verified Google Drive links for audit committees.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { showNaacPreviewDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.Description, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Preview & Export NAAC Criteria 5.3 Report")
                    }
                }
            }
        }

        item {
            Button(
                onClick = {
                    val csv = buildString {
                        appendLine("Roll Number,Student Name,Drive Files,Sheet Responses,Status,Approval Status")
                        state.students.forEach { s ->
                            appendLine("${s.rollNo},\"${s.name}\",${s.driveFiles.size},${s.sheetRecords.size},${s.overallStatus},${s.approvalStatus}")
                        }
                    }
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("Class Summary CSV", csv))
                    exportFeedbackText = "Class Summary CSV copied to clipboard (${state.students.size} records)!"
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.FileDownload, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Export Class Summary CSV")
            }
        }

        item {
            Button(
                onClick = {
                    val csv = buildString {
                        appendLine("Roll Number,Student Name,Certificate Type,File Name,Drive Link")
                        state.students.forEach { s ->
                            s.driveFiles.forEach { f ->
                                appendLine("${s.rollNo},\"${s.name}\",\"${f.detectedCertType ?: "Certificate"}\",\"${f.name}\",\"${f.webViewLink ?: ""}\"")
                            }
                        }
                    }
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("Individual Certificates CSV", csv))
                    exportFeedbackText = "Individual Certificates CSV copied to clipboard!"
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.FileDownload, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Export Individual Certificates CSV")
            }
        }

        item {
            Button(
                onClick = {
                    val csv = buildString {
                        appendLine("Timestamp,Action,User,Details,Category")
                        state.auditLogs.forEach { log ->
                            appendLine("\"${log.timestamp}\",\"${log.action}\",\"${log.user}\",\"${log.details}\",\"${log.category}\"")
                        }
                    }
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("Audit Logs CSV", csv))
                    exportFeedbackText = "Audit Logs CSV copied to clipboard (${state.auditLogs.size} logs)!"
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.FileDownload, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Export Audit Logs CSV")
            }
        }
    }

    if (exportFeedbackText != null) {
        AlertDialog(
            onDismissRequest = { exportFeedbackText = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Export Ready")
                }
            },
            text = { Text(exportFeedbackText ?: "") },
            confirmButton = {
                Button(onClick = { exportFeedbackText = null }) {
                    Text("OK")
                }
            }
        )
    }

    if (showNaacPreviewDialog) {
        val verifiedStudents = state.students.filter { it.overallStatus == "COMPLETED" }
        AlertDialog(
            onDismissRequest = { showNaacPreviewDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("NAAC Criteria 5.3 Audit Report")
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Institutional Report Summary: ${verifiedStudents.size} verified entries out of ${state.students.size} enrolled.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 300.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        LazyColumn(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(verifiedStudents.take(20)) { s ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${s.rollNo} - ${s.name}", style = MaterialTheme.typography.bodySmall)
                                        Text(
                                            "Certs: ${s.certificates.joinToString(", ")}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Text("VERIFIED", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary)
                                }
                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val report = buildString {
                            appendLine("================================================================================")
                            appendLine("INSTITUTIONAL ACCREDITATION REPORT: NAAC CRITERIA 5.3 & NBA COMPLIANCE")
                            appendLine("Class: ${state.appSettings.driveFolderName} | Total Verified: ${verifiedStudents.size}")
                            appendLine("================================================================================")
                            appendLine("S.No | Roll Number  | Student Name                      | Category       | Status")
                            appendLine("--------------------------------------------------------------------------------")
                            verifiedStudents.forEachIndexed { i, s ->
                                val cert = s.certificates.firstOrNull() ?: "General"
                                appendLine(String.format("%-4d | %-12s | %-33s | %-14s | VERIFIED", i + 1, s.rollNo, s.name.take(33), cert))
                            }
                        }
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("NAAC Report", report))
                        showNaacPreviewDialog = false
                        exportFeedbackText = "NAAC Criteria 5.3 Report copied to clipboard!"
                    }
                ) {
                    Text("Copy Formatted Report")
                }
            },
            dismissButton = {
                TextButton(onClick = { showNaacPreviewDialog = false }) {
                    Text("Close")
                }
            }
        )
    }
}
