package com.nodara.erp.data.model

import com.google.gson.annotations.SerializedName

data class ApiEnvelope<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("data") val data: T,
    @SerializedName("error") val error: ApiErrorDetail? = null
)

data class ApiErrorDetail(
    @SerializedName("code") val code: String,
    @SerializedName("details") val details: List<Any>? = null
)

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("user") val user: CurrentUser
)

data class CurrentUser(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("roleId") val roleId: String?,
    @SerializedName("companyId") val companyId: String?,
    @SerializedName("branchId") val branchId: String?,
    @SerializedName("status") val status: String,
    @SerializedName("company") val company: CompanyInfo?,
    @SerializedName("branch") val branch: BranchInfo?,
    @SerializedName("role") val role: RoleInfo?,
    @SerializedName("permissions") val permissions: List<String>?,
    @SerializedName("availableBranches") val availableBranches: List<BranchInfo>?
)

data class CompanyInfo(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("taxId") val taxId: String?
)

data class BranchInfo(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String?
)

data class RoleInfo(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String
)

data class SummaryMetric(
    @SerializedName("totalCents") val totalCents: Long,
    @SerializedName("count") val count: Int
)

data class ReconciliationInfo(
    @SerializedName("ledgerBalanced") val ledgerBalanced: Boolean,
    @SerializedName("ledgerDebitCents") val ledgerDebitCents: Long,
    @SerializedName("ledgerCreditCents") val ledgerCreditCents: Long,
    @SerializedName("ledgerEntryCount") val ledgerEntryCount: Int
)

data class DashboardSummary(
    @SerializedName("generatedAt") val generatedAt: String,
    @SerializedName("currency") val currency: String,
    @SerializedName("sales") val sales: SummaryMetric,
    @SerializedName("purchases") val purchases: SummaryMetric,
    @SerializedName("expenses") val expenses: SummaryMetric,
    @SerializedName("payments") val payments: SummaryMetric,
    @SerializedName("reconciliation") val reconciliation: ReconciliationInfo?
)

data class MasterProduct(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("category") val category: String?,
    @SerializedName("priceCents") val priceCents: Long?,
    @SerializedName("costCents") val costCents: Long?,
    @SerializedName("status") val status: String
)

data class InventoryBalance(
    @SerializedName("id") val id: String,
    @SerializedName("sku") val sku: String,
    @SerializedName("warehouseCode") val warehouseCode: String,
    @SerializedName("quantityOnHand") val quantityOnHand: Double,
    @SerializedName("quantityReserved") val quantityReserved: Double,
    @SerializedName("quantityAvailable") val quantityAvailable: Double
)

data class PurchaseOrder(
    @SerializedName("id") val id: String,
    @SerializedName("purchaseNumber") val purchaseNumber: String,
    @SerializedName("supplierName") val supplierName: String?,
    @SerializedName("status") val status: String,
    @SerializedName("totalCents") val totalCents: Long,
    @SerializedName("createdAt") val createdAt: String
)

data class SaleOrder(
    @SerializedName("id") val id: String,
    @SerializedName("saleNumber") val saleNumber: String,
    @SerializedName("customerName") val customerName: String?,
    @SerializedName("status") val status: String,
    @SerializedName("totalCents") val totalCents: Long,
    @SerializedName("createdAt") val createdAt: String
)

data class AccountingTrialRow(
    @SerializedName("accountCode") val accountCode: String,
    @SerializedName("accountName") val accountName: String,
    @SerializedName("debitCents") val debitCents: Long,
    @SerializedName("creditCents") val creditCents: Long,
    @SerializedName("balanceCents") val balanceCents: Long
)

data class CrmLead(
    @SerializedName("id") val id: String,
    @SerializedName("leadNumber") val leadNumber: String,
    @SerializedName("name") val name: String,
    @SerializedName("company") val company: String?,
    @SerializedName("status") val status: String,
    @SerializedName("estimatedValueCents") val estimatedValueCents: Long?
)

data class PosSession(
    @SerializedName("id") val id: String,
    @SerializedName("sessionNumber") val sessionNumber: String,
    @SerializedName("terminalCode") val terminalCode: String,
    @SerializedName("status") val status: String,
    @SerializedName("openingBalanceCents") val openingBalanceCents: Long,
    @SerializedName("currentBalanceCents") val currentBalanceCents: Long
)

data class HrEmployee(
    @SerializedName("id") val id: String,
    @SerializedName("employeeNumber") val employeeNumber: String,
    @SerializedName("firstName") val firstName: String,
    @SerializedName("lastName") val lastName: String,
    @SerializedName("department") val department: String?,
    @SerializedName("position") val position: String?,
    @SerializedName("status") val status: String
)
