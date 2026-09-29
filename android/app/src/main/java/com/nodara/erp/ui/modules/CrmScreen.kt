package com.nodara.erp.ui.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nodara.erp.data.model.CrmLead
import com.nodara.erp.data.repository.NodaraRepository
import com.nodara.erp.ui.components.ErrorBanner
import com.nodara.erp.ui.components.LoadingView
import com.nodara.erp.ui.components.StatusBadge
import com.nodara.erp.theme.*
import kotlinx.coroutines.launch

@Composable
fun CrmScreen(repository: NodaraRepository) {
    var leads by remember { mutableStateOf<List<CrmLead>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            isLoading = true
            errorMessage = null
            val res = repository.getLeads()
            if (res.isSuccess) {
                leads = res.getOrThrow()
            } else {
                errorMessage = res.exceptionOrNull()?.message ?: "Error al cargar CRM"
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { load() }

    if (isLoading) {
        LoadingView("Cargando prospectos CRM...")
    } else if (errorMessage != null) {
        ErrorBanner(errorMessage!!) { load() }
    } else {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(text = "Prospectos y CRM", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(leads) { lead ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = PaperWhite),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = lead.leadNumber, fontWeight = FontWeight.Bold, color = SignatureOrange)
                                StatusBadge(lead.status)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = lead.name, fontWeight = FontWeight.Bold)
                            if (!lead.company.isNullOrBlank()) {
                                Text(text = "Empresa: ${lead.company}", style = MaterialTheme.typography.bodySmall, color = MutedText)
                            }
                        }
                    }
                }
            }
        }
    }
}
