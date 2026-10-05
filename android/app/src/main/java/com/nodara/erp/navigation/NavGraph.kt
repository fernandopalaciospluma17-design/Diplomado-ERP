package com.nodara.erp.navigation

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.NavHostController
import androidx.navigation.compose.*
import com.nodara.erp.data.local.SessionManager
import com.nodara.erp.data.repository.NodaraRepository
import com.nodara.erp.ui.components.NodaraBottomBar
import com.nodara.erp.ui.components.NodaraTopBar
import com.nodara.erp.ui.dashboard.DashboardScreen
import com.nodara.erp.ui.dashboard.DashboardViewModel
import com.nodara.erp.ui.login.LoginScreen
import com.nodara.erp.ui.login.LoginViewModel
import com.nodara.erp.ui.modules.*
import kotlinx.coroutines.launch

@Composable
fun NavGraph(
    navController: NavHostController,
    repository: NodaraRepository,
    sessionManager: SessionManager
) {
    val startDestination = if (sessionManager.getToken().isNullOrBlank()) Screen.Login.route else Screen.Dashboard.route
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute != null && currentRoute != Screen.Login.route
    val showTopBar = currentRoute != null && currentRoute != Screen.Login.route

    val dashboardViewModel = remember { DashboardViewModel(repository) }
    val loginViewModel = remember { LoginViewModel(repository, sessionManager) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val dashboardState by dashboardViewModel.uiState.collectAsState()

    val currentUser = if (dashboardState is com.nodara.erp.ui.dashboard.DashboardUiState.Success) {
        (dashboardState as com.nodara.erp.ui.dashboard.DashboardUiState.Success).user
    } else null

    Scaffold(
        topBar = {
            if (showTopBar) {
                NodaraTopBar(
                    user = currentUser,
                    apiStatus = "API Operativa",
                    onRefresh = { dashboardViewModel.loadData() }
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NodaraBottomBar(currentRoute = currentRoute) { route ->
                    navController.navigate(route) {
                        popUpTo(Screen.Dashboard.route) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Login.route) {
                LoginScreen(viewModel = loginViewModel) {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            }
            composable(Screen.Dashboard.route) {
                DashboardScreen(viewModel = dashboardViewModel) { route ->
                    navController.navigate(route)
                }
            }
            composable(Screen.MasterData.route) {
                MasterDataScreen(repository)
            }
            composable(Screen.Inventory.route) {
                InventoryScreen(repository)
            }
            composable(Screen.Sales.route) {
                SalesScreen(repository)
            }
            composable(Screen.Purchases.route) {
                PurchasesScreen(repository)
            }
            composable(Screen.Accounting.route) {
                AccountingScreen(repository)
            }
            composable(Screen.Crm.route) {
                CrmScreen(repository)
            }
            composable(Screen.Pos.route) {
                PosScreen(repository)
            }
            composable(Screen.Hr.route) {
                HrScreen(repository)
            }
            composable(Screen.More.route) {
                Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
                    Text(text = "Opciones y Sesión", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                val revocation = repository.revokeCurrentSession()
                                sessionManager.clearSession()
                                navController.navigate(Screen.Login.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                                if (revocation.isFailure) {
                                    Toast.makeText(
                                        context,
                                        "Sesión local cerrada; no se pudo confirmar la revocación remota.",
                                        Toast.LENGTH_LONG
                                    ).show()
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Cerrar Sesión")
                    }
                }
            }
        }
    }
}
