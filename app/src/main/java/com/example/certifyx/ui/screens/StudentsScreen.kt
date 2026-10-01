package com.example.certifyx.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.clickable
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
import com.example.certifyx.model.StudentStatusRecord
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@Composable
fun StudentsScreen(state: UiState, viewModel: MainViewModel) {
    val context = LocalContext.current
    var showReminderDialog by remember { mutableStateOf(false) }
    var showImportCsvDialog by remember { mutableStateOf(false) }
    var csvInputText by remember { mutableStateOf("25A31A05GJ, KOPPAKA SRAVANI\n25A31A05GK, LINGAM SATISH") }
    var newSectionName by remember { mutableStateOf("CSE-Section C (Late Admissions)") }

    val filteredStudents = state.students.filter { student ->
        val matchesSearch = student.name.contains(state.searchQuery, ignoreCase = true) ||
                student.rollNo.contains(state.searchQuery, ignoreCase = true)
        val matchesFilter = state.statusFilter == "ALL" || student.overallStatus == state.statusFilter
        matchesSearch && matchesFilter
    }

    val defaulterCount = state.students.count { it.overallStatus != "COMPLETED" || it.approvalStatus == "REJECTED" }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Quick Action Bar: Remind Defaulters & Import Roster
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { showReminderDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Remind ($defaulterCount)")
            }
            OutlinedButton(
                onClick = { showImportCsvDialog = true },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.GroupAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Import CSV")
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = { viewModel.setSearchQuery(it) },
            label = { Text("Search by name or roll number...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = state.statusFilter == "ALL",
                onClick = { viewModel.setStatusFilter("ALL") },
                label = { Text("All (${state.students.size})") }
            )
            FilterChip(
                selected = state.statusFilter == "COMPLETED",
                onClick = { viewModel.setStatusFilter("COMPLETED") },
                label = { Text("Completed") }
            )
            FilterChip(
                selected = state.statusFilter == "PENDING",
                onClick = { viewModel.setStatusFilter("PENDING") },
                label = { Text("Pending") }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(filteredStudents) { student ->
                StudentCard(student = student, onClick = { viewModel.selectStudent(student) })
            }
        }
    }

    if (showReminderDialog) {
        val reminderMessage = viewModel.generateWhatsAppReminderMessage()
        AlertDialog(
            onDismissRequest = { showReminderDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Broadcast WhatsApp Reminder")
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Prepared automated reminder for $defaulterCount defaulter students:",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Text(
                            text = reminderMessage,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Certifyx WhatsApp Reminder", reminderMessage)
                        clipboard.setPrimaryClip(clip)
                        showReminderDialog = false
                    }
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Copy to Clipboard")
                }
            },
            dismissButton = {
                TextButton(onClick = { showReminderDialog = false }) {
                    Text("Close")
                }
            }
        )
    }

    if (showImportCsvDialog) {
        AlertDialog(
            onDismissRequest = { showImportCsvDialog = false },
            title = { Text("Import Class Roster (CSV / Text)") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Paste student lines in 'RollNumber, StudentName' format:", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = newSectionName,
                        onValueChange = { newSectionName = it },
                        label = { Text("Section / Batch Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = csvInputText,
                        onValueChange = { csvInputText = it },
                        label = { Text("CSV / Student List") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(150.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.importRosterCsv(csvInputText, newSectionName)
                        showImportCsvDialog = false
                    }
                ) {
                    Text("Import Students")
                }
            },
            dismissButton = {
                TextButton(onClick = { showImportCsvDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun StudentCard(student: StudentStatusRecord, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = student.name, style = MaterialTheme.typography.titleMedium)
                    Text(text = "Roll No: ${student.rollNo}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Badge(
                        containerColor = when (student.approvalStatus) {
                            "APPROVED" -> MaterialTheme.colorScheme.tertiaryContainer
                            "REJECTED" -> MaterialTheme.colorScheme.errorContainer
                            else -> MaterialTheme.colorScheme.surface
                        }
                    ) {
                        Text(
                            text = student.approvalStatus,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Drive Files: ${student.driveFiles.size}", style = MaterialTheme.typography.bodySmall)
                Text(text = "Sheet Records: ${student.sheetRecords.size}", style = MaterialTheme.typography.bodySmall)
                Text(text = "Submitted: ${if (student.submitted) "Yes" else "No"}", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
