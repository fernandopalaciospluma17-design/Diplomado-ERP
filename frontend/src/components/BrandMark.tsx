import { Image, StyleSheet, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoAsset = require('../../assets/logo.png');

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <Image
        accessibilityLabel="Logo de Nodara ERP"
        resizeMode="contain"
        source={logoAsset}
        style={compact ? styles.logoCompact : styles.logoFull}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logoFull: { width: 192, height: 57 },
  logoCompact: { width: 132, height: 39 },
});
