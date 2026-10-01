package com.example.certifyx.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.certifyx.model.StudentStatusRecord
import com.example.certifyx.viewmodel.MainViewModel

@Composable
fun StudentDetailDialog(student: StudentStatusRecord, viewModel: MainViewModel) {
    var showRejectFeedbackDialog by remember { mutableStateOf(false) }
    var rejectionReason by remember { mutableStateOf("Blurry document / Ineligible date") }

    AlertDialog(
        onDismissRequest = { viewModel.selectStudent(null) },
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = student.name, style = MaterialTheme.typography.titleMedium)
                    Text(text = student.rollNo, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                IconButton(onClick = { viewModel.selectStudent(null) }) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 450.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = "Faculty Approval Status:", style = MaterialTheme.typography.labelMedium)
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
                            if (student.feedbackReason != null) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Rejection Reason: ${student.feedbackReason}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }

                item {
                    Text(text = "Certificates (${student.certificates.size}):", style = MaterialTheme.typography.titleSmall)
                    if (student.certificates.isEmpty()) {
                        Text(text = "No certificates uploaded or recorded yet.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        student.certificates.forEach { cert ->
                            Text(text = "• $cert", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                item {
                    Text(text = "Faculty Review Actions", style = MaterialTheme.typography.titleSmall)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                viewModel.approveStudent(student.rollNo)
                                viewModel.selectStudent(null)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Approve")
                        }
                        OutlinedButton(
                            onClick = { showRejectFeedbackDialog = true },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Reject...")
                        }
                    }
                }

                item {
                    HorizontalDivider()
                    Text(text = "Manual Verification Toggles", style = MaterialTheme.typography.titleSmall)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Submitted")
                        Switch(
                            checked = student.submitted,
                            onCheckedChange = { viewModel.toggleStudentField(student.rollNo, "submitted", it) }
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Drive Uploaded")
                        Switch(
                            checked = student.driveUploaded,
                            onCheckedChange = { viewModel.toggleStudentField(student.rollNo, "driveUploaded", it) }
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Sheet Updated")
                        Switch(
                            checked = student.sheetUpdated,
                            onCheckedChange = { viewModel.toggleStudentField(student.rollNo, "sheetUpdated", it) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { viewModel.selectStudent(null) }) {
                Text("Close")
            }
        }
    )

    if (showRejectFeedbackDialog) {
        AlertDialog(
            onDismissRequest = { showRejectFeedbackDialog = false },
            title = { Text("Request Re-upload with Feedback") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Select or enter the reason for rejection so the student can re-upload correctly:", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = rejectionReason,
                        onValueChange = { rejectionReason = it },
                        label = { Text("Reason for Rejection") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.rejectStudent(student.rollNo, rejectionReason)
                        showRejectFeedbackDialog = false
                        viewModel.selectStudent(null)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Send Rejection")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRejectFeedbackDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
