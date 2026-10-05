package com.nodara.erp.data.repository

import com.nodara.erp.BuildConfig
import com.google.gson.GsonBuilder
import com.nodara.erp.data.local.SessionManager
import com.nodara.erp.data.model.*
import com.nodara.erp.data.remote.AuthInterceptor
import com.nodara.erp.data.remote.FlexibleListDeserializer
import com.nodara.erp.data.remote.NodaraApiService
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class SessionExpiredException : Exception("La sesión expiró. Inicia sesión nuevamente.")

class NodaraRepository(private val sessionManager: SessionManager) {
    private val gson = GsonBuilder()
        .registerTypeHierarchyAdapter(List::class.java, FlexibleListDeserializer())
        .create()

    private fun createApiService(baseUrl: String): NodaraApiService {
        val logging = HttpLoggingInterceptor().apply {
            redactHeader("Authorization")
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessionManager))
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(NodaraApiService::class.java)
    }

    private val api: NodaraApiService
        get() = createApiService(sessionManager.getBaseUrl())

    suspend fun checkHealth(): Result<Boolean> {
        return try {
            val res = api.getHealth()
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(true)
            } else {
                Result.failure(Exception("API no disponible"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun login(email: String, pass: String): Result<LoginResponse> {
        return try {
            val res = api.login(LoginRequest(email, pass))
            if (res.isSuccessful && res.body() != null && res.body()!!.success) {
                val loginData = res.body()!!.data
                sessionManager.saveToken(loginData.accessToken)
                Result.success(loginData)
            } else {
                val errorBody = res.errorBody()?.string()
                val message = parseErrorMessage(errorBody) ?: "Credenciales inválidas"
                Result.failure(Exception(message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun revokeCurrentSession(token: String): Result<Unit> {
        return try {
            val response = api.revokeCurrentSession("Bearer $token")
            if (response.isSuccessful || response.code() == 401) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("No se pudo confirmar la revocación de la sesión remota"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun switchCurrentBranch(branchId: String): Result<Unit> {
        return try {
            val response = api.switchCurrentSessionBranch(mapOf("branchId" to branchId))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(Unit)
            } else if (response.code() == 401) {
                sessionManager.clearSession()
                Result.failure(SessionExpiredException())
            } else {
                val message = parseErrorMessage(response.errorBody()?.string())
                    ?: "No se pudo cambiar la sucursal."
                Result.failure(Exception(message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCurrentUser(): Result<CurrentUser> {
        return try {
            val res = api.getCurrentUser()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                if (res.code() == 401) sessionManager.clearSession()
                Result.failure(Exception("No se pudo obtener el usuario"))
            }

        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSummary(): Result<DashboardSummary> {
        return try {
            val res = api.getSummary()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                if (res.code() == 401) sessionManager.clearSession()
                Result.failure(Exception("Error al cargar resumen analítico"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getProducts(): Result<List<MasterProduct>> {
        return try {
            val res = api.getProducts()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                Result.failure(Exception("Error al cargar productos"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getInventory(): Result<List<InventoryBalance>> {
        return try {
            val res = api.getInventoryBalances()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                val productsRes = getProducts()
                if (productsRes.isSuccess) {
                    val fallback = productsRes.getOrNull()?.map { product ->
                        InventoryBalance(
                            id = product.id,
                            sku = product.code,
                            warehouseCode = "PRINCIPAL",
                            quantityOnHand = 0.0,
                            quantityReserved = 0.0,
                            quantityAvailable = 0.0
                        )
                    } ?: emptyList()
                    Result.success(fallback)
                } else {
                    Result.success(emptyList())
                }
            }
        } catch (e: Exception) {
            val productsRes = getProducts()
            if (productsRes.isSuccess) {
                val fallback = productsRes.getOrNull()?.map { product ->
                    InventoryBalance(
                        id = product.id,
                        sku = product.code,
                        warehouseCode = "PRINCIPAL",
                        quantityOnHand = 0.0,
                        quantityReserved = 0.0,
                        quantityAvailable = 0.0
                    )
                } ?: emptyList()
                Result.success(fallback)
            } else {
                Result.success(emptyList())
            }
        }
    }

    suspend fun getPurchases(): Result<List<PurchaseOrder>> {
        return try {
            val res = api.getPurchases()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                Result.failure(Exception("Error al cargar compras"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSales(): Result<List<SaleOrder>> {
        return try {
            val res = api.getSales()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                Result.failure(Exception("Error al cargar ventas"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTrialBalance(): Result<List<AccountingTrialRow>> {
        return try {
            val res = api.getTrialBalance()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                Result.failure(Exception("Error al cargar balance contable"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getLeads(): Result<List<CrmLead>> {
        return try {
            val res = api.getLeads()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                Result.failure(Exception("Error al cargar CRM"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPosSessions(): Result<List<PosSession>> {
        return try {
            val res = api.getPosSessions()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                Result.failure(Exception("Error al cargar POS"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getEmployees(): Result<List<HrEmployee>> {
        return try {
            val res = api.getEmployees()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!.data)
            } else {
                Result.failure(Exception("Error al cargar RRHH"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseErrorMessage(errorJson: String?): String? {
        if (errorJson.isNullOrBlank()) return null
        return try {
            val envelope = gson.fromJson(errorJson, ApiEnvelope::class.java)
            envelope?.message
        } catch (_: Exception) {
            null
        }
    }
}
