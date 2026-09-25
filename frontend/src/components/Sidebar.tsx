import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from './BrandMark';
import { colors, radii, spacing, typography } from '../design/tokens';

export type NodaraModule = { label: string; shortLabel: string; endpoint: string | null; section?: string };

type SidebarProps = {
  modules: NodaraModule[];
  selected: string;
  onSelect: (module: NodaraModule) => void;
  onLogout: () => void;
  userName: string;
  compact: boolean;
};

export function Sidebar({ modules, selected, onSelect, onLogout, userName, compact }: SidebarProps) {
  return (
    <View style={[styles.sidebar, compact && styles.compactSidebar]}>
      <View style={styles.brandBlock}><BrandMark compact={compact} /></View>
      <ScrollView contentContainerStyle={styles.nav} horizontal={compact} showsHorizontalScrollIndicator={false}>
        {modules.map((module) => (
          <Pressable key={module.label} accessibilityRole="button" accessibilityLabel={`Abrir ${module.label}`} onPress={() => onSelect(module)} style={[styles.navItem, selected === module.label && styles.navItemActive]}>
            <View style={[styles.navGlyph, selected === module.label && styles.navGlyphActive]}><Text style={[styles.navGlyphText, selected === module.label && styles.navGlyphTextActive]}>{module.shortLabel}</Text></View>
            {!compact ? <Text style={[styles.navText, selected === module.label && styles.navTextActive]}>{module.label}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
      {!compact ? (
        <View style={styles.sidebarFooter}>
          <View style={styles.userBadge}><Text style={styles.userInitial}>{userName.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.userCopy}><Text numberOfLines={1} style={styles.userName}>{userName}</Text><Text style={styles.userRole}>Workspace activo</Text></View>
          <Pressable accessibilityLabel="Cerrar sesión" onPress={onLogout} style={styles.logout}><Text style={styles.logoutText}>Salir</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: colors.ink, minHeight: '100%', paddingHorizontal: spacing.md, paddingVertical: spacing.lg, width: 244 },
  compactSidebar: { minHeight: 74, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: '100%' },
  brandBlock: { marginBottom: spacing.xxl },
  nav: { gap: 6 },
  navItem: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: 12, minHeight: 46, paddingHorizontal: 10, paddingVertical: 8 },
  navItemActive: { backgroundColor: colors.slate },
  navGlyph: { alignItems: 'center', borderColor: '#5A6864', borderRadius: 7, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
  navGlyphActive: { backgroundColor: colors.signature, borderColor: colors.signature },
  navGlyphText: { color: '#A7B2AD', fontSize: 10, fontWeight: '800' },
  navGlyphTextActive: { color: colors.ink },
  navText: { color: '#B9C4BE', ...typography.body, fontSize: 14 },
  navTextActive: { color: colors.paper, fontWeight: '700' },
  sidebarFooter: { alignItems: 'center', borderTopColor: '#34403D', borderTopWidth: 1, flexDirection: 'row', gap: 9, marginTop: 'auto', paddingTop: spacing.md },
  userBadge: { alignItems: 'center', backgroundColor: colors.moss, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  userInitial: { color: colors.paper, fontWeight: '800' },
  userCopy: { flex: 1 },
  userName: { color: colors.paper, fontSize: 12, fontWeight: '700' },
  userRole: { color: '#95A39D', fontSize: 11, marginTop: 2 },
  logout: { padding: 4 },
  logoutText: { color: colors.signature, fontSize: 11, fontWeight: '800' },
});
