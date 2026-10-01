package com.example.certifyx.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.certifyx.model.AuditLogEntry
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@Composable
fun AuditLogsScreen(state: UiState, viewModel: MainViewModel) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.History, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = "Audit Logs & Sync History", style = MaterialTheme.colorScheme.titleLarge)
            }
        }

        items(state.auditLogs) { log ->
            AuditLogCard(log = log)
        }
    }
}

@Composable
fun AuditLogCard(log: AuditLogEntry) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = log.action, style = MaterialTheme.colorScheme.titleMedium, color = MaterialTheme.colorScheme.primary)
                Text(text = log.timestamp, style = MaterialTheme.colorScheme.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = log.details, style = MaterialTheme.colorScheme.bodyMedium)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "User: ${log.user} | Category: ${log.category}", style = MaterialTheme.colorScheme.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
