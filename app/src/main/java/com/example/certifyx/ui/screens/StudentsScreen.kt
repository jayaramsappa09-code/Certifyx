package com.example.certifyx.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.certifyx.model.StudentStatusRecord
import com.example.certifyx.viewmodel.MainViewModel
import com.example.certifyx.viewmodel.UiState

@Composable
fun StudentsScreen(state: UiState, viewModel: MainViewModel) {
    val filteredStudents = state.students.filter { student ->
        val matchesSearch = student.name.contains(state.searchQuery, ignoreCase = true) ||
                student.rollNo.contains(state.searchQuery, ignoreCase = true)
        val matchesFilter = state.statusFilter == "ALL" || student.overallStatus == state.statusFilter
        matchesSearch && matchesFilter
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = { viewModel.setSearchQuery(it) },
            label = { Text("Search by student name or roll number...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = state.statusFilter == "ALL",
                onClick = { viewModel.setStatusFilter("ALL") },
                label = { Text("All (${state.students.size})") }
            )
            FilterChip(
                selected = state.statusFilter == "COMPLETED",
                onClick = { viewModel.setStatusFilter("COMPLETED") },
                label = { Text("Completed") }
            )
            FilterChip(
                selected = state.statusFilter == "PENDING",
                onClick = { viewModel.setStatusFilter("PENDING") },
                label = { Text("Pending") }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(filteredStudents) { student ->
                StudentCard(student = student, onClick = { viewModel.selectStudent(student) })
            }
        }
    }
}

@Composable
fun StudentCard(student: StudentStatusRecord, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = student.name, style = MaterialTheme.colorScheme.titleMedium)
                    Text(text = "Roll No: ${student.rollNo}", style = MaterialTheme.colorScheme.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Badge(
                    containerColor = when (student.overallStatus) {
                        "COMPLETED" -> MaterialTheme.colorScheme.tertiaryContainer
                        "PENDING" -> MaterialTheme.colorScheme.errorContainer
                        else -> MaterialTheme.colorScheme.surface
                    }
                ) {
                    Text(
                        text = student.overallStatus,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.colorScheme.labelSmall
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Drive Files: ${student.driveFiles.size}", style = MaterialTheme.colorScheme.bodySmall)
                Text(text = "Sheet Responses: ${student.sheetRecords.size}", style = MaterialTheme.colorScheme.bodySmall)
                Text(text = "Submitted: ${if (student.submitted) "Yes" else "No"}", style = MaterialTheme.colorScheme.bodySmall)
            }
        }
    }
}
