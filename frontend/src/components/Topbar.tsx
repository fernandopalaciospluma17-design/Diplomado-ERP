import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CurrentUser } from '../types';
import { colors, radii, spacing, typography } from '../design/tokens';

type TopbarProps = {
  user: CurrentUser;
  apiStatus: string;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
};

export function Topbar({
  user,
  apiStatus,
  onRefresh,
  onLogout,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}: TopbarProps) {
  const branchName = user.branch?.name ?? user.branchId ?? 'Sucursal Principal';
  const companyName = user.company?.name ?? 'Nodara ERP';

  return (
    <View style={styles.topbar}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{companyName.toUpperCase()}</Text>
        <Text style={styles.title}>Centro de operaciones</Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.branchChip}>
          <Text style={styles.branchIcon}>🏢</Text>
          <Text style={styles.branchText}>{branchName}</Text>
        </View>

        <View style={styles.search}>
          <Text style={styles.searchIcon}>/</Text>
          <TextInput
            accessibilityLabel="Buscar en Nodara"
            placeholder="Buscar en Nodara..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        {onOpenNotifications ? (
          <Pressable accessibilityLabel="Notificaciones" onPress={onOpenNotifications} style={styles.iconButton}>
            <Text style={styles.iconText}>🔔</Text>
            {unreadNotificationsCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotificationsCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        <Pressable accessibilityLabel="Actualizar datos" onPress={onRefresh} style={styles.iconButton}>
          <Text style={styles.iconText}>↻</Text>
        </Pressable>

        <View style={styles.status}>
          <View style={[styles.statusDot, apiStatus === 'API operativa' ? styles.statusGood : styles.statusBad]} />
          <Text style={styles.statusText}>{apiStatus}</Text>
        </View>

        <Pressable accessibilityLabel={`Menú de ${user.name}`} onPress={onLogout} style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 86,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.paper,
  },
  heading: { flex: 1 },
  eyebrow: { color: colors.signature, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: colors.ink, ...typography.title, marginTop: 4, fontSize: 20 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mist,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  branchIcon: { fontSize: 13 },
  branchText: { color: colors.slate, fontSize: 12, fontWeight: '700' },
  search: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
    paddingHorizontal: 12,
    width: 200,
  },
  searchIcon: { color: colors.muted, fontSize: 14, fontWeight: '800', marginRight: 8 },
  searchInput: { color: colors.ink, flex: 1, fontSize: 13, outlineStyle: 'none' } as never,
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
    position: 'relative',
  },
  iconText: { color: colors.slate, fontSize: 16 },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.signature,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  status: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  statusDot: { borderRadius: 5, height: 9, width: 9 },
  statusGood: { backgroundColor: colors.success },
  statusBad: { backgroundColor: colors.signature },
  statusText: { color: colors.muted, fontSize: 12 },
  avatar: { alignItems: 'center', backgroundColor: colors.moss, borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
  avatarText: { color: colors.paper, fontWeight: '800' },
});
