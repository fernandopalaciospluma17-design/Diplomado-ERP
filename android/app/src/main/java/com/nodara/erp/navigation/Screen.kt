package com.nodara.erp.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Dashboard : Screen("dashboard")
    object MasterData : Screen("masterdata")
    object Inventory : Screen("inventory")
    object Sales : Screen("sales")
    object Purchases : Screen("purchases")
    object Accounting : Screen("accounting")
    object Crm : Screen("crm")
    object Pos : Screen("pos")
    object Hr : Screen("hr")
    object More : Screen("more")
}
