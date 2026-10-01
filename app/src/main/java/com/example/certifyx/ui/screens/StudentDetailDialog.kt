package com.example.certifyx.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.certifyx.model.StudentStatusRecord
import com.example.certifyx.viewmodel.MainViewModel

@Composable
fun StudentDetailDialog(student: StudentStatusRecord, viewModel: MainViewModel) {
    AlertDialog(
        onDismissRequest = { viewModel.selectStudent(null) },
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = student.name, style = MaterialTheme.colorScheme.titleMedium)
                IconButton(onClick = { viewModel.selectStudent(null) }) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(text = "Roll Number: ${student.rollNo}", style = MaterialTheme.colorScheme.bodyMedium)
                    Text(text = "Overall Status: ${student.overallStatus}", style = MaterialTheme.colorScheme.bodyMedium)
                }

                item {
                    Text(text = "Certificates (${student.certificates.size}):", style = MaterialTheme.colorScheme.titleSmall)
                    if (student.certificates.isEmpty()) {
                        Text(text = "No certificates uploaded or recorded yet.", style = MaterialTheme.colorScheme.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        student.certificates.forEach { cert ->
                            Text(text = "• $cert", style = MaterialTheme.colorScheme.bodySmall)
                        }
                    }
                }

                item {
                    Divider()
                    Text(text = "Verification Toggles", style = MaterialTheme.colorScheme.titleSmall)
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
}
