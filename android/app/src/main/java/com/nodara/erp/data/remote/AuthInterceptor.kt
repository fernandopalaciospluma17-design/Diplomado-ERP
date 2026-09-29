package com.nodara.erp.data.remote

import com.nodara.erp.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = sessionManager.getToken()

        val requestBuilder = original.newBuilder()
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")

        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        // Add idempotency key for POST requests if missing
        if (original.method.equals("POST", ignoreCase = true) && original.header("Idempotency-Key") == null) {
            requestBuilder.header("Idempotency-Key", "ANDROID-${System.currentTimeMillis()}-${(0..9999).random()}")
        }

        return chain.proceed(requestBuilder.build())
    }
}
