package com.example.certifyx.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.certifyx.model.StudentNotification
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentPortalScreen(state: UiState, viewModel: MainViewModel) {
    var selectedRollNo by remember { mutableStateOf(state.students.firstOrNull()?.rollNo ?: "25A31A05GB") }
    var expandedRollDropdown by remember { mutableStateOf(false) }

    val matchedStudent = state.students.find { it.rollNo.equals(selectedRollNo, ignoreCase = true) }
    var studentName by remember(matchedStudent) { mutableStateOf(matchedStudent?.name ?: "") }

    val certificateTypes = listOf(
        "Hackathon",
        "Course Completion",
        "Participation",
        "Merit Award",
        "Professional Certification",
        "Workshop",
        "Internship",
        "Other"
    )
    var selectedCertType by remember { mutableStateOf(certificateTypes[0]) }
    var expandedTypeDropdown by remember { mutableStateOf(false) }
    var certTitle by remember { mutableStateOf("Smart India Hackathon 2026") }

    var selectedFileUri by remember { mutableStateOf<Uri?>(null) }
    var selectedFileName by remember { mutableStateOf<String?>(null) }
    var isUploading by remember { mutableStateOf(false) }
    var uploadSuccessDialog by remember { mutableStateOf(false) }
    var lastUploadedFileName by remember { mutableStateOf("") }
    var showInboxDialog by remember { mutableStateOf(false) }

    val studentNotifications = viewModel.getNotificationsForStudent(selectedRollNo)
    val unreadCount = studentNotifications.count { !it.isRead }
    val currentStudentRecord = state.students.find { it.rollNo.equals(selectedRollNo, ignoreCase = true) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedFileUri = uri
        selectedFileName = uri?.lastPathSegment?.substringAfterLast("/") ?: "certificate_document.pdf"
    }

    // Auto-formatted standard file name for Google Drive
    val cleanCertTitle = certTitle.trim().replace(Regex("[^A-Za-z0-9]"), "_").take(30)
    val standardFileName = "${selectedRollNo}_${selectedCertType.replace(" ", "_")}${if (cleanCertTitle.isNotBlank()) "_$cleanCertTitle" else ""}.pdf"

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
                            imageVector = Icons.Default.CloudUpload,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Student Certificate Upload Portal",
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = "Direct upload to Google Drive & automated Google Sheets recording",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "1. Student Identification",
                        style = MaterialTheme.typography.titleMedium
                    )

                    // Roll Number Dropdown / Selector
                    ExposedDropdownMenuBox(
                        expanded = expandedRollDropdown,
                        onExpandedChange = { expandedRollDropdown = !expandedRollDropdown }
                    ) {
                        OutlinedTextField(
                            value = selectedRollNo,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Select Your Roll Number") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedRollDropdown) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        )
                        ExposedDropdownMenu(
                            expanded = expandedRollDropdown,
                            onDismissRequest = { expandedRollDropdown = false }
                        ) {
                            state.students.forEach { s ->
                                DropdownMenuItem(
                                    text = { Text("${s.rollNo} - ${s.name}") },
                                    onClick = {
                                        selectedRollNo = s.rollNo
                                        studentName = s.name
                                        expandedRollDropdown = false
                                    }
                                )
                            }
                        }
                    }

                    // Student Name (Auto-filled)
                    OutlinedTextField(
                        value = studentName,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Student Name (Verified from Roster)") },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) }
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Notifications, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("In-App Notification Center", style = MaterialTheme.typography.titleSmall)
                        }
                        if (unreadCount > 0) {
                            Badge(containerColor = MaterialTheme.colorScheme.error) {
                                Text("$unreadCount NEW", modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                    Text(
                        text = if (studentNotifications.isNotEmpty()) "Latest: ${studentNotifications.first().title}" else "No messages from faculty yet.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    OutlinedButton(
                        onClick = { showInboxDialog = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Mail, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Open My Messages (${studentNotifications.size})")
                    }

                    // Approval Status Banner for this student
                    currentStudentRecord?.let { s ->
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Accreditation Approval Status:", style = MaterialTheme.typography.labelMedium)
                            Badge(
                                containerColor = when (s.approvalStatus) {
                                    "APPROVED" -> MaterialTheme.colorScheme.tertiaryContainer
                                    "REJECTED" -> MaterialTheme.colorScheme.errorContainer
                                    else -> MaterialTheme.colorScheme.surface
                                }
                            ) {
                                Text(s.approvalStatus, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                        if (s.feedbackReason != null) {
                            Text(
                                text = "Faculty Feedback: ${s.feedbackReason}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "2. Certificate Details",
                        style = MaterialTheme.typography.titleMedium
                    )

                    // Certificate Type Dropdown
                    ExposedDropdownMenuBox(
                        expanded = expandedTypeDropdown,
                        onExpandedChange = { expandedTypeDropdown = !expandedTypeDropdown }
                    ) {
                        OutlinedTextField(
                            value = selectedCertType,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Certificate Category") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedTypeDropdown) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        )
                        ExposedDropdownMenu(
                            expanded = expandedTypeDropdown,
                            onDismissRequest = { expandedTypeDropdown = false }
                        ) {
                            certificateTypes.forEach { type ->
                                DropdownMenuItem(
                                    text = { Text(type) },
                                    onClick = {
                                        selectedCertType = type
                                        expandedTypeDropdown = false
                                    }
                                )
                            }
                        }
                    }

                    // Certificate Title / Event Name
                    OutlinedTextField(
                        value = certTitle,
                        onValueChange = { certTitle = it },
                        label = { Text("Event / Course / Title") },
                        placeholder = { Text("e.g. Smart India Hackathon, Coursera ML, NPTEL") },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Default.CardMembership, contentDescription = null) }
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "3. Select File & Drive Target",
                        style = MaterialTheme.typography.titleMedium
                    )

                    Button(
                        onClick = { filePickerLauncher.launch("application/pdf") },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.AttachFile, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (selectedFileName == null) "Select Certificate File (PDF)" else "File Selected: $selectedFileName")
                    }

                    // Target Google Drive information
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Folder, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Target Google Drive Folder:",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = state.appSettings.driveFolderName,
                                style = MaterialTheme.typography.titleSmall
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Standardized Target File Name:",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = standardFileName,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    // Direct Upload Button
                    Button(
                        onClick = {
                            isUploading = true
                            lastUploadedFileName = standardFileName
                            viewModel.uploadStudentCertificate(
                                rollNo = selectedRollNo,
                                studentName = studentName,
                                certType = selectedCertType,
                                certTitle = certTitle,
                                fileName = standardFileName
                            )
                            isUploading = false
                            uploadSuccessDialog = true
                            selectedFileUri = null
                            selectedFileName = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        if (isUploading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Uploading Directly to Google Drive...")
                        } else {
                            Icon(Icons.Default.CloudDone, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Upload Directly to Drive & Submit")
                        }
                    }
                }
            }
        }

        // Student's Current Certificate Status Card
        if (matchedStudent != null) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = "My Verified Certificates", style = MaterialTheme.typography.titleMedium)
                            Badge(
                                containerColor = when (matchedStudent.overallStatus) {
                                    "COMPLETED" -> MaterialTheme.colorScheme.tertiaryContainer
                                    "PENDING" -> MaterialTheme.colorScheme.errorContainer
                                    else -> MaterialTheme.colorScheme.surface
                                }
                            ) {
                                Text(
                                    text = matchedStudent.overallStatus,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Drive Files: ${matchedStudent.driveFiles.size} | Sheet Responses: ${matchedStudent.sheetRecords.size}",
                            style = MaterialTheme.typography.bodySmall
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        if (matchedStudent.driveFiles.isEmpty()) {
                            Text(
                                text = "No certificates uploaded yet. Use the upload box above to submit.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        } else {
                            matchedStudent.driveFiles.forEach { file ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .padding(12.dp)
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(text = file.name, style = MaterialTheme.typography.bodyMedium)
                                            Text(
                                                text = "Category: ${file.detectedCertType ?: "Certificate"}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        Icon(
                                            Icons.Default.CheckCircle,
                                            contentDescription = "Verified in Drive",
                                            tint = MaterialTheme.colorScheme.tertiary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (uploadSuccessDialog) {
        AlertDialog(
            onDismissRequest = { uploadSuccessDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Certificate Uploaded Successfully!")
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Your certificate has been processed and saved directly into the class Google Drive folder.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    HorizontalDivider()
                    Text(text = "File Name: $lastUploadedFileName", style = MaterialTheme.typography.bodySmall)
                    Text(text = "Drive Folder: ${state.appSettings.driveFolderName}", style = MaterialTheme.typography.bodySmall)
                    Text(text = "Google Sheet: Automatically logged & verified in '${state.appSettings.sheetName}'", style = MaterialTheme.typography.bodySmall)
                    Text(text = "Compliance Status: COMPLETED", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.tertiary)
                }
            },
            confirmButton = {
                Button(onClick = { uploadSuccessDialog = false }) {
                    Text("Done")
                }
            }
        )
    }

    if (showInboxDialog) {
        AlertDialog(
            onDismissRequest = { showInboxDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Notifications, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("In-App Messages ($selectedRollNo)")
                }
            },
            text = {
                if (studentNotifications.isEmpty()) {
                    Text("You have no messages or alerts from faculty at this time.", style = MaterialTheme.typography.bodyMedium)
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 350.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(studentNotifications) { notif ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.markNotificationAsRead(notif.id) },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (notif.isRead) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primaryContainer
                                )
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = notif.title,
                                            style = MaterialTheme.typography.titleSmall,
                                            color = if (notif.isRead) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                        if (!notif.isRead) {
                                            Badge(containerColor = MaterialTheme.colorScheme.error) {
                                                Text("NEW", style = MaterialTheme.typography.labelSmall)
                                            }
                                        }
                                    }
                                    Text(
                                        text = notif.message,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (notif.isRead) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "From: ${notif.sender}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.outline
                                        )
                                        Text(
                                            text = notif.timestamp,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.outline
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { showInboxDialog = false }) {
                    Text("Close")
                }
            }
        )
    }
}
