package com.nodara.erp.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import com.nodara.erp.navigation.Screen
import com.nodara.erp.theme.SignatureOrange
import com.nodara.erp.theme.SlateGray

sealed class BottomNavItem(val route: String, val title: String, val icon: ImageVector) {
    object Summary : BottomNavItem(Screen.Dashboard.route, "Resumen", Icons.Default.Dashboard)
    object MasterData : BottomNavItem(Screen.MasterData.route, "Maestros", Icons.Default.Category)
    object Inventory : BottomNavItem(Screen.Inventory.route, "Inventario", Icons.Default.Inventory)
    object Sales : BottomNavItem(Screen.Sales.route, "Ventas", Icons.Default.PointOfSale)
    object More : BottomNavItem(Screen.More.route, "Más", Icons.Default.Menu)
}

@Composable
fun NodaraBottomBar(currentRoute: String?, onNavigate: (String) -> Unit) {
    val items = listOf(
        BottomNavItem.Summary,
        BottomNavItem.MasterData,
        BottomNavItem.Inventory,
        BottomNavItem.Sales,
        BottomNavItem.More
    )

    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                icon = { Icon(item.icon, contentDescription = item.title) },
                label = { Text(item.title) },
                selected = selected,
                onClick = {
                    if (!selected) onNavigate(item.route)
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = SignatureOrange,
                    selectedTextColor = SignatureOrange,
                    unselectedIconColor = SlateGray,
                    unselectedTextColor = SlateGray
                )
            )
        }
    }
}
