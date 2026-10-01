package com.example.certifyx.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
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
                Text(text = "Application Settings", style = MaterialTheme.colorScheme.titleLarge)
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Admin Emails", style = MaterialTheme.colorScheme.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    state.appSettings.adminEmails.forEach { email ->
                        Text(text = "• $email", style = MaterialTheme.colorScheme.bodyMedium)
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
                    Text(text = "Sync Configuration", style = MaterialTheme.colorScheme.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = "Auto Sync Interval: ${state.appSettings.autoSyncIntervalMinutes} minutes", style = MaterialTheme.colorScheme.bodyMedium)
                    Text(text = "Spreadsheet Write Enabled: ${state.appSettings.enableSpreadsheetWrite}", style = MaterialTheme.colorScheme.bodyMedium)
                }
            }
        }
    }
}
