package com.example.certifyx.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@Composable
fun SettingsScreen(state: UiState, viewModel: MainViewModel) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.Settings, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = "Application Settings & Scale Plan", style = MaterialTheme.typography.titleLarge)
            }
        }

        // 6,000-User Zero-Cost Scale Architecture Plan
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CloudDone, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Zero-Cost 6,000-User Scale Plan",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Text(
                        text = "How Certifyx operates smoothly for 6,000+ students at ₹0 / $0 monthly expense:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    Text(
                        text = "1. File Storage: Google Drive (15 GB Free or College Workspace for Education). 6,000 compressed PDFs (~500KB each) require only ~3 GB.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "2. Database: Google Sheets (Supports up to 10,000,000 cells). 6,000 rows x 15 columns = 90,000 cells (under 1% capacity).",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "3. API Execution: Google Apps Script Webhooks (20,000 free calls / day quota). Zero server maintenance.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "4. App Distribution: Direct APK download + PWA hosted on free tiers (GitHub Pages / Cloudflare Pages).",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "5. Total Monthly Hosting Cost: $0.00 / month guaranteed.",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Admin Emails", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    state.appSettings.adminEmails.forEach { email ->
                        Text(text = "• $email", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Sync Configuration", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = "Auto Sync Interval: ${state.appSettings.autoSyncIntervalMinutes} minutes", style = MaterialTheme.typography.bodyMedium)
                    Text(text = "Spreadsheet Write Enabled: ${state.appSettings.enableSpreadsheetWrite}", style = MaterialTheme.typography.bodyMedium)
                    Text(text = "Active Target Sheet: ${state.appSettings.sheetName}", style = MaterialTheme.typography.bodyMedium)
                    Text(text = "Active Target Drive Folder: ${state.appSettings.driveFolderName}", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
