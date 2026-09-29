package com.nodara.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nodara.erp.data.model.CurrentUser
import com.nodara.erp.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NodaraTopBar(user: CurrentUser?, apiStatus: String, onRefresh: () -> Unit) {
    val branchName = user?.branch?.name ?: "Sucursal Principal"
    val companyName = user?.company?.code ?: "NODARA ERP"

    TopAppBar(
        title = {
            Column {
                Text(
                    text = companyName.uppercase(),
                    color = SignatureOrange,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Text(
                    text = branchName,
                    color = InkBlack,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        actions = {
            IconButton(onClick = onRefresh) {
                Icon(imageVector = Icons.Default.Refresh, contentDescription = "Actualizar", tint = SlateGray)
            }
            Box(
                modifier = Modifier
                    .padding(end = 12.dp)
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(MossGreen),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = (user?.name?.take(1) ?: "N").uppercase(),
                    color = PaperWhite,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = PaperWhite)
    )
}
