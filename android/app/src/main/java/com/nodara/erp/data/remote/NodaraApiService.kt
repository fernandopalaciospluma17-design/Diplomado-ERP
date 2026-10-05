package com.nodara.erp.data.remote

import com.nodara.erp.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface NodaraApiService {

    @GET("health")
    suspend fun getHealth(): Response<ApiEnvelope<Map<String, Any>>>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiEnvelope<LoginResponse>>

    @GET("auth/me")
    suspend fun getCurrentUser(): Response<ApiEnvelope<CurrentUser>>

    @DELETE("core/sessions/current")
    suspend fun revokeCurrentSession(@Header("Authorization") authorization: String): Response<ApiEnvelope<Map<String, Boolean>>>

    @PATCH("core/sessions/current/branch")
    suspend fun switchCurrentSessionBranch(@Body request: Map<String, String>): Response<ApiEnvelope<Map<String, Any>>>

    @GET("reports/summary")
    suspend fun getSummary(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("branchId") branchId: String? = null
    ): Response<ApiEnvelope<DashboardSummary>>

    @GET("master-data/products")
    suspend fun getProducts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiEnvelope<List<MasterProduct>>>

    @GET("inventory")
    suspend fun getInventoryBalances(): Response<ApiEnvelope<List<InventoryBalance>>>

    @GET("purchases")
    suspend fun getPurchases(): Response<ApiEnvelope<List<PurchaseOrder>>>

    @GET("sales")
    suspend fun getSales(): Response<ApiEnvelope<List<SaleOrder>>>

    @GET("accounting/trial-balance")
    suspend fun getTrialBalance(): Response<ApiEnvelope<List<AccountingTrialRow>>>

    @GET("crm/leads")
    suspend fun getLeads(): Response<ApiEnvelope<List<CrmLead>>>

    @GET("pos/sessions")
    suspend fun getPosSessions(): Response<ApiEnvelope<List<PosSession>>>

    @GET("hr/employees")
    suspend fun getEmployees(): Response<ApiEnvelope<List<HrEmployee>>>
}
