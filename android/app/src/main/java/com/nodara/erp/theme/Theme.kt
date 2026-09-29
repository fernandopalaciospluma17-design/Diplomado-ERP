package com.nodara.erp.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = SignatureOrange,
    onPrimary = InkBlack,
    secondary = MossGreen,
    onSecondary = PaperWhite,
    background = MistBg,
    onBackground = InkBlack,
    surface = PaperWhite,
    onSurface = InkBlack,
    error = DangerRed,
    onError = PaperWhite
)

@Composable
fun NodaraERPTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = NodaraTypography,
        content = content
    )
}
