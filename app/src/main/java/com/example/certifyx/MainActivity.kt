package com.example.certifyx

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.certifyx.ui.screens.*
import com.example.certifyx.ui.theme.CertifyxTheme
import com.example.certifyx.viewmodel.AppTab
import com.example.certifyx.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CertifyxTheme {
                val state by viewModel.uiState.collectAsState()
                val snackbarHostState = remember { SnackbarHostState() }
                var showInstallHelpDialog by remember { mutableStateOf(false) }

                // Quick role state: Student Mode vs Faculty/Admin Mode
                val isStudentMode = state.currentTab == AppTab.STUDENT_PORTAL

                LaunchedEffect(state.snackbarMessage) {
                    state.snackbarMessage?.let { msg ->
                        snackbarHostState.showSnackbar(msg)
                        viewModel.clearSnackbar()
                    }
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        Column {
                            TopAppBar(
                                title = {
                                    Column {
                                        Text(text = "Certifyx", style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            text = if (isStudentMode) "Student Certificate Portal" else "Faculty & Admin Manager",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                },
                                actions = {
                                    IconButton(onClick = { showInstallHelpDialog = true }) {
                                        Icon(
                                            Icons.Default.HelpOutline,
                                            contentDescription = "APK Installation Guide"
                                        )
                                    }
                                },
                                colors = TopAppBarDefaults.topAppBarColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                    titleContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            )

                            // Unified Single Mode Switcher Bar
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    FilterChip(
                                        selected = isStudentMode,
                                        onClick = { viewModel.setTab(AppTab.STUDENT_PORTAL) },
                                        label = { Text("🎓 Student Portal") },
                                        leadingIcon = if (isStudentMode) {
                                            { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                                        } else null,
                                        modifier = Modifier.weight(1f)
                                    )
                                    FilterChip(
                                        selected = !isStudentMode,
                                        onClick = { viewModel.setTab(AppTab.DASHBOARD) },
                                        label = { Text("📋 Faculty View") },
                                        leadingIcon = if (!isStudentMode) {
                                            { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                                        } else null,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    },
                    bottomBar = {
                        if (!isStudentMode) {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = state.currentTab == AppTab.DASHBOARD,
                                    onClick = { viewModel.setTab(AppTab.DASHBOARD) },
                                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard") },
                                    label = { Text("Home") }
                                )
                                NavigationBarItem(
                                    selected = state.currentTab == AppTab.STUDENTS,
                                    onClick = { viewModel.setTab(AppTab.STUDENTS) },
                                    icon = { Icon(Icons.Default.People, contentDescription = "Students") },
                                    label = { Text("Roster") }
                                )
                                NavigationBarItem(
                                    selected = state.currentTab == AppTab.BROADCAST_ALERTS,
                                    onClick = { viewModel.setTab(AppTab.BROADCAST_ALERTS) },
                                    icon = { Icon(Icons.Default.Campaign, contentDescription = "Broadcast Alerts") },
                                    label = { Text("Alerts") }
                                )
                                NavigationBarItem(
                                    selected = state.currentTab == AppTab.GOOGLE_INTEGRATION,
                                    onClick = { viewModel.setTab(AppTab.GOOGLE_INTEGRATION) },
                                    icon = { Icon(Icons.Default.Cloud, contentDescription = "Google Sync") },
                                    label = { Text("Sync") }
                                )
                                NavigationBarItem(
                                    selected = state.currentTab == AppTab.SETTINGS,
                                    onClick = { viewModel.setTab(AppTab.SETTINGS) },
                                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                                    label = { Text("Settings") }
                                )
                            }
                        } else {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = true,
                                    onClick = { viewModel.setTab(AppTab.STUDENT_PORTAL) },
                                    icon = { Icon(Icons.Default.CloudUpload, contentDescription = "Upload Certificate") },
                                    label = { Text("Upload Certificate") }
                                )
                                NavigationBarItem(
                                    selected = false,
                                    onClick = { viewModel.setTab(AppTab.STUDENTS) },
                                    icon = { Icon(Icons.Default.Checklist, contentDescription = "Class Progress") },
                                    label = { Text("Class Progress") }
                                )
                                NavigationBarItem(
                                    selected = false,
                                    onClick = { showInstallHelpDialog = true },
                                    icon = { Icon(Icons.Default.Download, contentDescription = "Mobile APK Help") },
                                    label = { Text("App Help") }
                                )
                            }
                        }
                    },
                    snackbarHost = { SnackbarHost(snackbarHostState) }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        when (state.currentTab) {
                            AppTab.DASHBOARD -> DashboardScreen(state, viewModel)
                            AppTab.STUDENTS -> StudentsScreen(state, viewModel)
                            AppTab.BROADCAST_ALERTS -> BroadcastAlertsScreen(state, viewModel)
                            AppTab.STUDENT_PORTAL -> StudentPortalScreen(state, viewModel)
                            AppTab.GOOGLE_INTEGRATION -> GoogleIntegrationScreen(state, viewModel)
                            AppTab.RECONCILIATION -> ReconciliationScreen(state, viewModel)
                            AppTab.MANUAL_REVIEW -> ManualReviewScreen(state, viewModel)
                            AppTab.EXPORT -> ExportScreen(state, viewModel)
                            AppTab.AUDIT_LOGS -> AuditLogsScreen(state, viewModel)
                            AppTab.SETTINGS -> SettingsScreen(state, viewModel)
                        }

                        state.selectedStudent?.let { student ->
                            StudentDetailDialog(student = student, viewModel = viewModel)
                        }

                        if (showInstallHelpDialog) {
                            AlertDialog(
                                onDismissRequest = { showInstallHelpDialog = false },
                                title = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Why APK Install Fails & How to Fix")
                                    }
                                },
                                text = {
                                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Text(
                                            text = "If Android blocked installing the APK file or says 'App not installed', follow these 3 quick steps:",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        Card(
                                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                                        ) {
                                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text(
                                                    text = "1. Enable 'Install Unknown Apps'",
                                                    style = MaterialTheme.typography.titleSmall
                                                )
                                                Text(
                                                    text = "Open phone Settings > Apps > Special app access > Install unknown apps > Select your browser (Chrome/Files) > Toggle 'Allow from this source'.",
                                                    style = MaterialTheme.typography.bodySmall
                                                )
                                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                                                Text(
                                                    text = "2. Uninstall Any Previous Version First",
                                                    style = MaterialTheme.typography.titleSmall
                                                )
                                                Text(
                                                    text = "If an older test build of Certifyx or another app with the same ID is already on the phone, uninstall it first before tapping the new APK.",
                                                    style = MaterialTheme.typography.bodySmall
                                                )
                                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                                                Text(
                                                    text = "3. Google Play Protect Warning",
                                                    style = MaterialTheme.typography.titleSmall
                                                )
                                                Text(
                                                    text = "If Play Protect shows 'Blocked by Play Protect', tap 'More details' and then 'Install anyway'.",
                                                    style = MaterialTheme.typography.bodySmall
                                                )
                                            }
                                        }
                                    }
                                },
                                confirmButton = {
                                    Button(onClick = { showInstallHelpDialog = false }) {
                                        Text("Got it")
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
