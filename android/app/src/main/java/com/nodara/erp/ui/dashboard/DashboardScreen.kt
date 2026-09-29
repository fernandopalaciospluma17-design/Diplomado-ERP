package com.nodara.erp.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nodara.erp.data.model.DashboardSummary
import com.nodara.erp.data.model.SummaryMetric
import com.nodara.erp.ui.components.ErrorBanner
import com.nodara.erp.ui.components.LoadingView
import com.nodara.erp.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onNavigateToModule: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    when (val state = uiState) {
        is DashboardUiState.Loading -> LoadingView("Sincronizando con Nodara ERP...")
        is DashboardUiState.Error -> ErrorBanner(state.message) { viewModel.loadData() }
        is DashboardUiState.Success -> {
            val user = state.user
            val summary = state.summary
            val currency = summary?.currency ?: "MXN"

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Greeting Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = PaperWhite),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "RESUMEN OPERATIVO",
                            color = SignatureOrange,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.5.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Hola, ${user.name.split(" ").first()}",
                            style = MaterialTheme.typography.titleLarge,
                            color = InkBlack
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${user.company?.name ?: "Empresa"} • ${user.branch?.name ?: "Sucursal"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MutedText
                        )
                    }
                }

                // Metrics Grid
                if (summary != null) {
                    Text(
                        text = "Indicadores Financieros",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricCard(
                            title = "Ventas del periodo",
                            metric = summary.sales,
                            currency = currency,
                            color = SignatureOrange,
                            modifier = Modifier.weight(1f)
                        ) { onNavigateToModule("sales") }
                        MetricCard(
                            title = "Compras recibidas",
                            metric = summary.purchases,
                            currency = currency,
                            color = MossGreen,
                            modifier = Modifier.weight(1f)
                        ) { onNavigateToModule("purchases") }
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricCard(
                            title = "Gastos registrados",
                            metric = summary.expenses,
                            currency = currency,
                            color = SlateGray,
                            modifier = Modifier.weight(1f)
                        ) { onNavigateToModule("accounting") }
                        MetricCard(
                            title = "Pagos aplicados",
                            metric = summary.payments,
                            currency = currency,
                            color = InkBlack,
                            modifier = Modifier.weight(1f)
                        ) { onNavigateToModule("accounting") }
                    }

                    // Ledger Reconciliation
                    if (summary.reconciliation != null) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFE6F1EB)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "CONTROL CONTABLE DE PARTIDA DOBLE",
                                    color = MossGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = if (summary.reconciliation.ledgerBalanced) "✓ Ledger Contable Cuadrado" else "⚠️ Requiere revisión de balance",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = InkBlack,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "${summary.reconciliation.ledgerEntryCount} asientos publicados en el diario",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MutedText
                                )
                            }
                        }
                    }
                }

                // Quick Navigation Grid
                Text(
                    text = "Módulos ERP",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ModuleShortcutButton("Maestros", "MS", Modifier.weight(1f)) { onNavigateToModule("masterdata") }
                        ModuleShortcutButton("Inventario", "IV", Modifier.weight(1f)) { onNavigateToModule("inventory") }
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ModuleShortcutButton("Ventas", "VT", Modifier.weight(1f)) { onNavigateToModule("sales") }
                        ModuleShortcutButton("Compras", "CP", Modifier.weight(1f)) { onNavigateToModule("purchases") }
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ModuleShortcutButton("Finanzas", "FN", Modifier.weight(1f)) { onNavigateToModule("accounting") }
                        ModuleShortcutButton("CRM", "CR", Modifier.weight(1f)) { onNavigateToModule("crm") }
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ModuleShortcutButton("POS Caja", "PS", Modifier.weight(1f)) { onNavigateToModule("pos") }
                        ModuleShortcutButton("RRHH", "RH", Modifier.weight(1f)) { onNavigateToModule("hr") }
                    }
                }
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    metric: SummaryMetric,
    currency: String,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val format = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
    val formattedMoney = try {
        format.format(metric.totalCents / 100.0)
    } catch (_: Exception) {
        "$ ${metric.totalCents / 100.0}"
    }

    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = PaperWhite),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(
                modifier = Modifier
                    .size(width = 24.dp, height = 6.dp)
                    .background(color, RoundedCornerShape(3.dp))
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = title, color = MutedText, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = formattedMoney, color = InkBlack, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = "${metric.count} docs", color = MutedText, fontSize = 10.sp)
        }
    }
}

@Composable
fun ModuleShortcutButton(title: String, code: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = SlateGray),
        shape = RoundedCornerShape(8.dp),
        modifier = modifier.height(52.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Column {
                Text(text = code, color = SignatureOrange, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                Text(text = title, color = PaperWhite, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
            Text(text = "→", color = PaperWhite, fontSize = 16.sp)
        }
    }
}
