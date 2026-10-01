package com.example.certifyx.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
fun GoogleIntegrationScreen(state: UiState, viewModel: MainViewModel) {
    val context = LocalContext.current
    var webhookUrl by remember { mutableStateOf(state.appSettings.appsScriptWebhookUrl) }
    var showCopiedDialog by remember { mutableStateOf(false) }

    val appsScriptTemplate = """
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folder = DriveApp.getFolderById("${state.appSettings.driveFolderId}");
    var sheet = SpreadsheetApp.openById("${state.appSettings.spreadsheetId}").getSheetByName("${state.appSettings.sheetName}");
    
    // 1. Create file in Google Drive
    var decoded = Utilities.base64Decode(data.fileBase64);
    var blob = Utilities.newBlob(decoded, "application/pdf", data.fileName);
    var file = folder.createFile(blob);
    
    // 2. Append row to Google Sheet
    sheet.appendRow([new Date(), data.rollNo, data.studentName, data.certType, data.certTitle, file.getUrl()]);
    
    return ContentService.createTextOutput(JSON.stringify({status: "SUCCESS", fileUrl: file.getUrl()}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "ERROR", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
""".trimIndent()

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
                        Icon(imageVector = Icons.Default.Cloud, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = "Google Cloud & Live Sync Hub", style = MaterialTheme.typography.titleLarge)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = "Connect Google Drive and Sheets with zero server costs using Google Apps Script Webhooks.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // Live Google Apps Script Webhook Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Webhook, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Live Google Apps Script Webhook", style = MaterialTheme.typography.titleMedium)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Allows any student to upload certificates directly into Drive and Sheet without needing GCP API billing:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = webhookUrl,
                        onValueChange = { webhookUrl = it },
                        label = { Text("Webhook Deployment URL") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Google Apps Script", appsScriptTemplate))
                            showCopiedDialog = true
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Copy Google Apps Script Code")
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
                    Text(text = "Target Google Drive Folder", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = state.appSettings.driveFolderName,
                        onValueChange = {},
                        label = { Text("Folder Name") },
                        modifier = Modifier.fillMaxWidth(),
                        readOnly = true
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = state.appSettings.driveFolderId,
                        onValueChange = {},
                        label = { Text("Folder ID") },
                        modifier = Modifier.fillMaxWidth(),
                        readOnly = true
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
                    Text(text = "Target Google Spreadsheet", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = state.appSettings.spreadsheetName,
                        onValueChange = {},
                        label = { Text("Spreadsheet Name") },
                        modifier = Modifier.fillMaxWidth(),
                        readOnly = true
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = state.appSettings.sheetName,
                        onValueChange = {},
                        label = { Text("Tab Sheet Name") },
                        modifier = Modifier.fillMaxWidth(),
                        readOnly = true
                    )
                }
            }
        }

        item {
            Button(
                onClick = { viewModel.runSync() },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Sync, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Run Synchronization Engine")
            }
        }
    }

    if (showCopiedDialog) {
        AlertDialog(
            onDismissRequest = { showCopiedDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Code Copied!")
                }
            },
            text = {
                Text("The Google Apps Script code has been copied to your clipboard. Paste it into your Google Spreadsheet's Extensions > Apps Script and click 'Deploy as Web App' with access set to 'Anyone'.")
            },
            confirmButton = {
                Button(onClick = { showCopiedDialog = false }) {
                    Text("Got it")
                }
            }
        )
    }
}
