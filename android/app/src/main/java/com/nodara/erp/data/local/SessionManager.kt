package com.nodara.erp.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SessionManager(context: Context) {
    private val securePrefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "nodara_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
    private val configPrefs: SharedPreferences by lazy {
        context.getSharedPreferences("nodara_config_prefs", Context.MODE_PRIVATE)
    }

    companion object {
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_BASE_URL = "base_url"
        const val DEFAULT_BASE_URL = "https://diplomado-erp.onrender.com/api/v1/"
    }

    fun saveToken(token: String) {
        securePrefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getToken(): String? {
        return securePrefs.getString(KEY_TOKEN, null)
    }

    fun clearSession() {
        securePrefs.edit().remove(KEY_TOKEN).apply()
    }

    fun saveBaseUrl(url: String) {
        var formatted = url.trim()
        if (!formatted.endsWith("/")) formatted += "/"
        configPrefs.edit().putString(KEY_BASE_URL, formatted).apply()
    }

    fun getBaseUrl(): String {
        val saved = configPrefs.getString(KEY_BASE_URL, null)
        if (saved == null || saved.contains("10.0.2.2") || saved.contains("192.168.") || saved.contains("192.166.")) {
            saveBaseUrl(DEFAULT_BASE_URL)
            return DEFAULT_BASE_URL
        }
        return saved
    }
}
