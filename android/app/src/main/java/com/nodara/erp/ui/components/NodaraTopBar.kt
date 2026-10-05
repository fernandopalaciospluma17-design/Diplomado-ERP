package com.nodara.erp.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nodara.erp.R
import com.nodara.erp.data.model.CurrentUser
import com.nodara.erp.data.model.BranchInfo
import com.nodara.erp.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NodaraTopBar(
    user: CurrentUser?,
    apiStatus: String,
    onRefresh: () -> Unit,
    onChangeBranch: (BranchInfo) -> Unit = {}
) {
    val branchName = user?.branch?.name ?: "Sucursal Principal"
    val companyName = user?.company?.code ?: "NODARA ERP"
    val availableBranches = user?.availableBranches.orEmpty()
    var branchMenuExpanded by remember { mutableStateOf(false) }

    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(id = R.drawable.nodara_logo),
                    contentDescription = "Logo Nodara ERP",
                    modifier = Modifier
                        .width(90.dp)
                        .height(27.dp)
                        .padding(end = 8.dp)
                )
                Column {
                    Text(
                        text = companyName.uppercase(),
                        color = SignatureOrange,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Box {
                        TextButton(
                            onClick = { branchMenuExpanded = true },
                            enabled = availableBranches.size > 1
                        ) {
                            Text(
                                text = if (branchMenuExpanded) "$branchName  ▾" else branchName,
                                color = InkBlack,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        DropdownMenu(
                            expanded = branchMenuExpanded,
                            onDismissRequest = { branchMenuExpanded = false }
                        ) {
                            availableBranches.forEach { branch ->
                                DropdownMenuItem(
                                    text = { Text(branch.name) },
                                    onClick = {
                                        branchMenuExpanded = false
                                        if (branch.id != user?.branchId) onChangeBranch(branch)
                                    },
                                    enabled = branch.id != user?.branchId
                                )
                            }
                        }
                    }
                }
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
