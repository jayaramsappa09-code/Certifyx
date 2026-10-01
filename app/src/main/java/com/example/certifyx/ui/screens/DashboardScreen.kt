package com.example.certifyx.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.example.certifyx.viewmodel.AppTab
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@Composable
fun DashboardScreen(state: UiState, viewModel: MainViewModel) {
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
                            imageVector = Icons.Default.Verified,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Class Certificate Automation Manager",
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = "Automated compliance tracking between Google Drive & Sheets",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { viewModel.setTab(AppTab.STUDENT_PORTAL) },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CloudUpload, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Upload")
                        }
                        Button(
                            onClick = { viewModel.setTab(AppTab.BROADCAST_ALERTS) },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Campaign, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Broadcast")
                        }
                        Button(
                            onClick = { viewModel.runSync() },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Sync")
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "Key Metrics & Overview",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(vertical = 4.dp)
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = "Total Roster",
                    value = "${state.students.size}",
                    subtitle = "Students enrolled",
                    icon = Icons.Default.Group,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = "Completed",
                    value = "${state.students.count { it.overallStatus == "COMPLETED" }}",
                    subtitle = "Drive & Sheet verified",
                    icon = Icons.Default.CheckCircle,
                    color = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = "Pending",
                    value = "${state.students.count { it.overallStatus == "PENDING" }}",
                    subtitle = "Partial verification",
                    icon = Icons.Default.HourglassEmpty,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = "Integrity Score",
                    value = "${state.reconciliationAnalysis?.summary?.integrityScore ?: 100}%",
                    subtitle = "Data consistency",
                    icon = Icons.Default.Shield,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Latest Sync Summary", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    val report = state.lastSyncReport
                    if (report != null) {
                        Text(text = "Timestamp: ${report.timestamp}", style = MaterialTheme.typography.bodySmall)
                        Text(text = "Students Checked: ${report.studentsChecked}", style = MaterialTheme.typography.bodySmall)
                        Text(text = "Drive Files Scanned: ${report.driveFilesScanned}", style = MaterialTheme.typography.bodySmall)
                        Text(text = "Spreadsheet Records Checked: ${report.spreadsheetRecordsChecked}", style = MaterialTheme.typography.bodySmall)
                        Text(text = "Duration: ${report.durationMs}ms", style = MaterialTheme.typography.bodySmall)
                    } else {
                        Text(text = "No sync executed yet.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = title, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Icon(imageVector = icon, contentDescription = null, tint = color)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = value, style = MaterialTheme.typography.headlineMedium)
            Text(text = subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
