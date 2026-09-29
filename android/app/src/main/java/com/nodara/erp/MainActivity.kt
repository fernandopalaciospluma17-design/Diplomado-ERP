package com.nodara.erp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import com.nodara.erp.data.local.SessionManager
import com.nodara.erp.data.repository.NodaraRepository
import com.nodara.erp.navigation.NavGraph
import com.nodara.erp.theme.NodaraERPTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sessionManager = SessionManager(applicationContext)
        val repository = NodaraRepository(sessionManager)

        setContent {
            NodaraERPTheme {
                val navController = rememberNavController()
                NavGraph(
                    navController = navController,
                    repository = repository,
                    sessionManager = sessionManager
                )
            }
        }
    }
}
