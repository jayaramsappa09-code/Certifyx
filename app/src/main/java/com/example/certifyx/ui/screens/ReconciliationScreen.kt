package com.example.certifyx.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@Composable
fun ReconciliationScreen(state: UiState, viewModel: MainViewModel) {
    val analysis = state.reconciliationAnalysis

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
                        Icon(imageVector = Icons.Default.Assessment, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = "Reconciliation & Gap Analysis", style = MaterialTheme.colorScheme.titleLarge)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = "Automated cross-checking of Google Drive certificates against Google Sheet form responses and class roster.", style = MaterialTheme.colorScheme.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        if (analysis != null) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Integrity Summary Score", style = MaterialTheme.colorScheme.titleMedium)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "${analysis.summary.integrityScore}%", style = MaterialTheme.colorScheme.headlineLarge, color = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "Matched Roster Students: ${analysis.summary.matchedRosterCount} / ${analysis.totalRosterStudents}", style = MaterialTheme.colorScheme.bodyMedium)
                        Text(text = "Drive Files Missing in Sheet: ${analysis.summary.driveMissingSheetCount}", style = MaterialTheme.colorScheme.bodySmall)
                        Text(text = "Sheet Records Missing in Drive: ${analysis.summary.sheetMissingDriveCount}", style = MaterialTheme.colorScheme.bodySmall)
                        Text(text = "Quantity Mismatches: ${analysis.summary.quantityMismatchCount}", style = MaterialTheme.colorScheme.bodySmall)
                    }
                }
            }
        }
    }
}
