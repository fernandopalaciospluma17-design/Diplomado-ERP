import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../design/tokens';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}><Text style={styles.markText}>N</Text></View>
      {!compact ? <Text style={styles.wordmark}>nodara</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  mark: { alignItems: 'center', backgroundColor: colors.signature, borderRadius: radii.sm, height: 34, justifyContent: 'center', width: 34 },
  markText: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  wordmark: { color: colors.paper, fontSize: 22, fontWeight: '800', letterSpacing: 0.4 },
});
