package com.nodara.erp.ui.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nodara.erp.data.model.HrEmployee
import com.nodara.erp.data.repository.NodaraRepository
import com.nodara.erp.ui.components.ErrorBanner
import com.nodara.erp.ui.components.LoadingView
import com.nodara.erp.ui.components.StatusBadge
import com.nodara.erp.theme.*
import kotlinx.coroutines.launch

@Composable
fun HrScreen(repository: NodaraRepository) {
    var employees by remember { mutableStateOf<List<HrEmployee>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            isLoading = true
            errorMessage = null
            val res = repository.getEmployees()
            if (res.isSuccess) {
                employees = res.getOrThrow()
            } else {
                errorMessage = res.exceptionOrNull()?.message ?: "Error al cargar RRHH"
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { load() }

    if (isLoading) {
        LoadingView("Cargando colaboradores...")
    } else if (errorMessage != null) {
        ErrorBanner(errorMessage!!) { load() }
    } else {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(text = "Recursos Humanos", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(employees) { emp ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = PaperWhite),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = emp.employeeNumber, fontWeight = FontWeight.Bold, color = SignatureOrange)
                                StatusBadge(emp.status)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = "${emp.firstName} ${emp.lastName}", fontWeight = FontWeight.Bold)
                            if (!emp.department.isNullOrBlank()) {
                                Text(text = "Depto: ${emp.department} • Puesto: ${emp.position ?: "N/A"}", style = MaterialTheme.typography.bodySmall, color = MutedText)
                            }
                        }
                    }
                }
            }
        }
    }
}
