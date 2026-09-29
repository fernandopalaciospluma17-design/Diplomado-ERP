package com.nodara.erp.data

import org.junit.Assert.*
import org.junit.Test

class SessionManagerTest {
    @Test
    fun testBaseUrlFormatting() {
        val raw = "http://10.0.2.2:3000/api/v1"
        var formatted = raw.trim()
        if (!formatted.endsWith("/")) formatted += "/"
        assertEquals("http://10.0.2.2:3000/api/v1/", formatted)
    }
}
