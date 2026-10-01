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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BroadcastAlertsScreen(state: UiState, viewModel: MainViewModel) {
    val context = LocalContext.current

    var selectedGroup by remember { mutableStateOf("NOT_STARTED") }
    var selectedUrgency by remember { mutableStateOf("DEADLINE") }
    var alertTitle by remember { mutableStateOf("Urgent: NAAC Accreditation Certificate Deadline") }
    var alertMessage by remember {
        mutableStateOf("All pending certificates must be submitted before 5:00 PM tomorrow. Ensure your roll number and name are visible on the PDF.")
    }
    var senderName by remember { mutableStateOf("Faculty Academic Coordinator") }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var lastDispatchedCount by remember { mutableIntStateOf(0) }

    val targetStudents = when (selectedGroup) {
        "NOT_STARTED" -> state.students.filter { it.overallStatus == "NOT STARTED" }
        "PENDING" -> state.students.filter { it.overallStatus == "PENDING" }
        "REJECTED" -> state.students.filter { it.approvalStatus == "REJECTED" }
        "APPROVED" -> state.students.filter { it.approvalStatus == "APPROVED" }
        else -> state.students
    }

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
                        Icon(
                            imageVector = Icons.Default.Campaign,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Admin Broadcast & Alert Dispatch",
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = "Broadcast push alerts to targeted student groups regarding certificate compliance",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // 1. Target Student Group Selection
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(text = "1. Select Target Student Group", style = MaterialTheme.typography.titleMedium)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = selectedGroup == "NOT_STARTED",
                            onClick = { selectedGroup = "NOT_STARTED" },
                            label = { Text("Not Started (${viewModel.notStartedCount})") }
                        )
                        FilterChip(
                            selected = selectedGroup == "PENDING",
                            onClick = { selectedGroup = "PENDING" },
                            label = { Text("Pending Review (${viewModel.pendingCount})") }
                        )
                        FilterChip(
                            selected = selectedGroup == "REJECTED",
                            onClick = { selectedGroup = "REJECTED" },
                            label = { Text("Rejected (${viewModel.rejectedCount})") }
                        )
                        FilterChip(
                            selected = selectedGroup == "APPROVED",
                            onClick = { selectedGroup = "APPROVED" },
                            label = { Text("Approved (${viewModel.approvedCount})") }
                        )
                        FilterChip(
                            selected = selectedGroup == "ALL",
                            onClick = { selectedGroup = "ALL" },
                            label = { Text("All Students (${viewModel.totalStudentsCount})") }
                        )
                    }

                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = MaterialTheme.shapes.small,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Group, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Target Audience: ${targetStudents.size} students selected",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
            }
        }

        // 2. Alert Urgency Level
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(text = "2. Urgency & Alert Type", style = MaterialTheme.typography.titleMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = selectedUrgency == "DEADLINE",
                            onClick = { selectedUrgency = "DEADLINE" },
                            label = { Text("🔴 Deadline") },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = selectedUrgency == "ACTION_REQUIRED",
                            onClick = { selectedUrgency = "ACTION_REQUIRED" },
                            label = { Text("🟡 Action") },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = selectedUrgency == "NOTICE",
                            onClick = { selectedUrgency = "NOTICE" },
                            label = { Text("🔵 Notice") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // 3. Quick Message Templates
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "3. Quick Template Fill", style = MaterialTheme.typography.titleMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                alertTitle = "Urgent: NAAC Accreditation Certificate Deadline"
                                alertMessage = "All pending certificates must be submitted before 5:00 PM tomorrow. Ensure your roll number and name are visible on the PDF."
                                selectedUrgency = "DEADLINE"
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Deadline Alert")
                        }
                        OutlinedButton(
                            onClick = {
                                alertTitle = "Action Required: Re-upload Rejected Document"
                                alertMessage = "Your certificate could not be accepted. Please review faculty feedback in Certifyx and submit a clean, readable PDF scan."
                                selectedUrgency = "ACTION_REQUIRED"
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Re-upload Alert")
                        }
                    }
                }
            }
        }

        // 4. Message Content & Dispatch
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(text = "4. Compose Alert", style = MaterialTheme.typography.titleMedium)

                    OutlinedTextField(
                        value = alertTitle,
                        onValueChange = { alertTitle = it },
                        label = { Text("Alert Title") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = alertMessage,
                        onValueChange = { alertMessage = it },
                        label = { Text("Message Body") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(110.dp)
                    )

                    OutlinedTextField(
                        value = senderName,
                        onValueChange = { senderName = it },
                        label = { Text("Sender / Authority Signature") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Button(
                        onClick = {
                            val count = viewModel.broadcastAlertToGroup(
                                targetGroup = selectedGroup,
                                title = alertTitle,
                                message = alertMessage,
                                priority = selectedUrgency,
                                sender = senderName
                            )
                            lastDispatchedCount = count
                            showSuccessDialog = true
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Broadcast Push Alert to ${targetStudents.size} Students")
                    }

                    OutlinedButton(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val formattedText = """
📢 *$alertTitle*
From: $senderName

$alertMessage

👉 Open Certifyx App to verify your submission status immediately.
                            """.trimIndent()
                            clipboard.setPrimaryClip(ClipData.newPlainText("Broadcast Alert", formattedText))
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Copy WhatsApp / Telegram Text")
                    }
                }
            }
        }

        // 5. Recent Dispatched Broadcasts
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Recent Dispatched Broadcasts", style = MaterialTheme.typography.titleMedium)
                    val recentAlerts = state.notifications.take(5)
                    if (recentAlerts.isEmpty()) {
                        Text(
                            text = "No broadcasts sent yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        recentAlerts.forEach { alert ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(alert.title, style = MaterialTheme.typography.bodySmall)
                                    Text(
                                        "${alert.timestamp} • To: ${alert.recipientRollNo}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Badge(
                                    containerColor = when (alert.type) {
                                        "DEADLINE" -> MaterialTheme.colorScheme.errorContainer
                                        "ACTION_REQUIRED" -> MaterialTheme.colorScheme.errorContainer
                                        "APPROVAL" -> MaterialTheme.colorScheme.tertiaryContainer
                                        else -> MaterialTheme.colorScheme.primaryContainer
                                    }
                                ) {
                                    Text(alert.type, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall)
                                }
                            }
                            HorizontalDivider()
                        }
                    }
                }
            }
        }
    }

    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = { showSuccessDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Broadcast Alert Sent!")
                }
            },
            text = {
                Text("Your alert '$alertTitle' was successfully dispatched to the in-app notification inboxes of all $lastDispatchedCount students in the target group.")
            },
            confirmButton = {
                Button(onClick = { showSuccessDialog = false }) {
                    Text("OK")
                }
            }
        )
    }
}
