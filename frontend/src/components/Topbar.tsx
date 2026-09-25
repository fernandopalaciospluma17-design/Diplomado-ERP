import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '../design/tokens';

export function Topbar({ userName, apiStatus, onRefresh, onLogout }: { userName: string; apiStatus: string; onRefresh: () => void; onLogout: () => void }) {
  return (
    <View style={styles.topbar}>
      <View style={styles.heading}><Text style={styles.eyebrow}>NODARA ERP</Text><Text style={styles.title}>Centro de operaciones</Text></View>
      <View style={styles.actions}>
        <View style={styles.search}><Text style={styles.searchIcon}>/</Text><TextInput accessibilityLabel="Buscar" placeholder="Buscar en Nodara" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>
        <Pressable accessibilityLabel="Actualizar datos" onPress={onRefresh} style={styles.iconButton}><Text style={styles.iconText}>↻</Text></Pressable>
        <View style={styles.status}><View style={[styles.statusDot, apiStatus === 'API operativa' ? styles.statusGood : styles.statusBad]} /><Text style={styles.statusText}>{apiStatus}</Text></View>
        <Pressable accessibilityLabel={`Menú de ${userName}`} onPress={onLogout} style={styles.avatar}><Text style={styles.avatarText}>{userName.slice(0, 1).toUpperCase()}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 86, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  heading: { flex: 1 },
  eyebrow: { color: colors.signature, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: colors.ink, ...typography.title, marginTop: 5 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  search: { alignItems: 'center', backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row', height: 40, paddingHorizontal: 12, width: 220 },
  searchIcon: { color: colors.muted, fontSize: 16, fontWeight: '800', marginRight: 8 },
  searchInput: { color: colors.ink, flex: 1, fontSize: 13, outlineStyle: 'none' } as never,
  iconButton: { alignItems: 'center', backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  iconText: { color: colors.slate, fontSize: 20, fontWeight: '700' },
  status: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  statusDot: { borderRadius: 5, height: 9, width: 9 },
  statusGood: { backgroundColor: colors.success },
  statusBad: { backgroundColor: colors.signature },
  statusText: { color: colors.muted, fontSize: 12 },
  avatar: { alignItems: 'center', backgroundColor: colors.moss, borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
  avatarText: { color: colors.paper, fontWeight: '800' },
});
