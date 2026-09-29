package com.nodara.erp.ui.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nodara.erp.data.model.AccountingTrialRow
import com.nodara.erp.data.repository.NodaraRepository
import com.nodara.erp.ui.components.ErrorBanner
import com.nodara.erp.ui.components.LoadingView
import com.nodara.erp.theme.*
import kotlinx.coroutines.launch

@Composable
fun AccountingScreen(repository: NodaraRepository) {
    var rows by remember { mutableStateOf<List<AccountingTrialRow>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            isLoading = true
            errorMessage = null
            val res = repository.getTrialBalance()
            if (res.isSuccess) {
                rows = res.getOrThrow()
            } else {
                errorMessage = res.exceptionOrNull()?.message ?: "Error al cargar contabilidad"
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { load() }

    if (isLoading) {
        LoadingView("Calculando balance contable...")
    } else if (errorMessage != null) {
        ErrorBanner(errorMessage!!) { load() }
    } else {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(text = "Balance de Comprobación", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(rows) { row ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = PaperWhite),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = row.accountCode, fontWeight = FontWeight.Bold, color = SlateGray)
                                Text(text = "Saldo: $ ${(row.balanceCents / 100.0)}", color = MossGreen, fontWeight = FontWeight.ExtraBold)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = row.accountName, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
