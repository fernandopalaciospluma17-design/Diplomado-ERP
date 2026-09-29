package com.nodara.erp.ui.modules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nodara.erp.data.model.InventoryBalance
import com.nodara.erp.data.repository.NodaraRepository
import com.nodara.erp.ui.components.ErrorBanner
import com.nodara.erp.ui.components.LoadingView
import com.nodara.erp.theme.*
import kotlinx.coroutines.launch

@Composable
fun InventoryScreen(repository: NodaraRepository) {
    var balances by remember { mutableStateOf<List<InventoryBalance>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            isLoading = true
            errorMessage = null
            val res = repository.getInventory()
            if (res.isSuccess) {
                balances = res.getOrThrow()
            } else {
                errorMessage = res.exceptionOrNull()?.message ?: "Error al cargar inventario"
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { load() }

    if (isLoading) {
        LoadingView("Consultando existencias...")
    } else if (errorMessage != null) {
        ErrorBanner(errorMessage!!) { load() }
    } else {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(text = "Inventario y Existencias", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(balances) { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = PaperWhite),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = item.sku, fontWeight = FontWeight.Bold, color = SlateGray)
                                Text(text = "Almacén: ${item.warehouseCode}", fontWeight = FontWeight.Bold, color = MossGreen)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = "Disponible: ${item.quantityAvailable}", fontWeight = FontWeight.ExtraBold)
                                Text(text = "A mano: ${item.quantityOnHand}", color = MutedText)
                                Text(text = "Reservado: ${item.quantityReserved}", color = MutedText)
                            }
                        }
                    }
                }
            }
        }
    }
}
