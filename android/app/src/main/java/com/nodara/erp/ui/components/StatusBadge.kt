package com.nodara.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nodara.erp.theme.SuccessGreen
import com.nodara.erp.theme.DangerRed
import com.nodara.erp.theme.SignatureOrange
import com.nodara.erp.theme.SlateGray

@Composable
fun StatusBadge(status: String) {
    val upper = status.uppercase()
    val (bgColor, textColor) = when (upper) {
        "ACTIVE", "APPROVED", "RECEIVED", "PAID", "DELIVERED", "OPEN", "PRESENT" ->
            Pair(Color(0xFFE6F4EA), SuccessGreen)
        "PENDING", "PENDING_APPROVAL", "QUOTATION", "ORDER", "NEW" ->
            Pair(Color(0xFFFEF3D6), Color(0xFFB47800))
        "CANCELLED", "INACTIVE", "LOST", "CLOSED", "ABSENT" ->
            Pair(Color(0xFFFCE8E6), DangerRed)
        else ->
            Pair(Color(0xFFF4F5F1), SlateGray)
    }

    Box(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = status,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold
        )
    }
}
