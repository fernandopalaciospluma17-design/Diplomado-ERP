import { Modal as RNModal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NotificationItem } from '../../types';
import { colors, radii, spacing, typography } from '../../design/tokens';

type NotificationDrawerProps = {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClearAll?: () => void;
};

export function NotificationDrawer({ visible, onClose, notifications, onClearAll }: NotificationDrawerProps) {
  return (
    <RNModal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notificaciones</Text>
              <Text style={styles.subtitle}>Actividad del sistema y avisos operativos</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar notificaciones" onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No tienes notificaciones pendientes.</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View key={item.id} style={[styles.card, !item.read && styles.unreadCard]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.time}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.message}>{item.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
          {notifications.length > 0 && onClearAll ? (
            <View style={styles.footer}>
              <Pressable onPress={onClearAll} style={styles.clearBtn}>
                <Text style={styles.clearText}>Limpiar notificaciones</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(24, 32, 31, 0.4)',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    width: 360,
    backgroundColor: colors.paper,
    height: '100%',
    shadowColor: colors.ink,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { color: colors.ink, ...typography.title, fontSize: 18 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: colors.slate, fontSize: 14, fontWeight: '800' },
  body: { padding: spacing.md },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 13 },
  card: {
    backgroundColor: colors.mist,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.signature,
    backgroundColor: colors.paper,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  time: { color: colors.muted, fontSize: 10 },
  message: { color: colors.slate, fontSize: 12, lineHeight: 17 },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    alignItems: 'center',
  },
  clearBtn: { paddingVertical: 6 },
  clearText: { color: colors.moss, fontSize: 12, fontWeight: '700' },
});
