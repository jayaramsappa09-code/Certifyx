package com.example.certifyx

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.example.certifyx.ui.screens.*
import com.example.certifyx.ui.theme.CertifyxTheme
import com.example.certifyx.viewmodel.AppTab
import com.example.certifyx.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CertifyxTheme {
                val state by viewModel.uiState.collectAsState()
                val snackbarHostState = remember { SnackbarHostState() }

                LaunchedEffect(state.snackbarMessage) {
                    state.snackbarMessage?.let { msg ->
                        snackbarHostState.showSnackbar(msg)
                        viewModel.clearSnackbar()
                    }
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        TopAppBar(
                            title = { Text(text = "Certifyx - Certificate Manager") },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                titleContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    },
                    bottomBar = {
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
                                label = { Text("Students") }
                            )
                            NavigationBarItem(
                                selected = state.currentTab == AppTab.GOOGLE_INTEGRATION,
                                onClick = { viewModel.setTab(AppTab.GOOGLE_INTEGRATION) },
                                icon = { Icon(Icons.Default.Cloud, contentDescription = "Google Sync") },
                                label = { Text("Sync") }
                            )
                            NavigationBarItem(
                                selected = state.currentTab == AppTab.RECONCILIATION,
                                onClick = { viewModel.setTab(AppTab.RECONCILIATION) },
                                icon = { Icon(Icons.Default.Assessment, contentDescription = "Reconciliation") },
                                label = { Text("Gaps") }
                            )
                            NavigationBarItem(
                                selected = state.currentTab == AppTab.SETTINGS,
                                onClick = { viewModel.setTab(AppTab.SETTINGS) },
                                icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                                label = { Text("Settings") }
                            )
                        }
                    },
                    snackbarHost = { SnackbarHost(snackbarHostState) }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        when (state.currentTab) {
                            AppTab.DASHBOARD -> DashboardScreen(state, viewModel)
                            AppTab.STUDENTS -> StudentsScreen(state, viewModel)
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
                    }
                }
            }
        }
    }
}
