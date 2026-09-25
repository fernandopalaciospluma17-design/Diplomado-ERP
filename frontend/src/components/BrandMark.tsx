import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../design/tokens';

// Logo extraído desde LOGO.fig
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoAsset = require('../../assets/logo.png');

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <Image
        accessibilityLabel="Logo de Nodara ERP"
        resizeMode="contain"
        source={logoAsset}
        style={[styles.logo, compact ? styles.logoCompact : styles.logoFull]}
      />
      {!compact ? <Text style={styles.wordmark}>nodara</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logo: {
    borderRadius: radii.sm,
  },
  logoFull: { width: 36, height: 36 },
  logoCompact: { width: 28, height: 28 },
  wordmark: { color: colors.paper, fontSize: 22, fontWeight: '800', letterSpacing: 0.4 },
});
