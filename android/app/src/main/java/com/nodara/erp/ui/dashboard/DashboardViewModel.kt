package com.nodara.erp.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nodara.erp.data.model.CurrentUser
import com.nodara.erp.data.model.DashboardSummary
import com.nodara.erp.data.repository.NodaraRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class DashboardUiState {
    object Loading : DashboardUiState()
    data class Success(val user: CurrentUser, val summary: DashboardSummary?) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}

class DashboardViewModel(private val repository: NodaraRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            val userResult = repository.getCurrentUser()
            if (userResult.isFailure) {
                _uiState.value = DashboardUiState.Error(userResult.exceptionOrNull()?.message ?: "No se pudo autenticar")
                return@launch
            }
            val user = userResult.getOrThrow()

            val summaryResult = repository.getSummary()
            val summary = summaryResult.getOrNull()

            _uiState.value = DashboardUiState.Success(user, summary)
        }
    }
}
