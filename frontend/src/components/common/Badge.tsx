import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../../design/tokens';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'signature';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const normalizedTone = getToneFromLabel(label, tone);
  return (
    <View style={[styles.badge, styles[normalizedTone]]}>
      <Text style={[styles.text, styles[`${normalizedTone}Text`]]}>{label}</Text>
    </View>
  );
}

function getToneFromLabel(label: string, defaultTone: BadgeTone): BadgeTone {
  const upper = label.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'RECEIVED', 'PAID', 'DELIVERED', 'CONVERTED', 'OPEN', 'PRESENT'].includes(upper)) return 'success';
  if (['PENDING', 'PENDING_APPROVAL', 'PARTIALLY_RECEIVED', 'QUOTATION', 'ORDER', 'NEW', 'QUALIFIED', 'REMOTE'].includes(upper)) return 'warning';
  if (['CANCELLED', 'INACTIVE', 'LOST', 'CLOSED', 'ABSENT'].includes(upper)) return 'danger';
  if (['DRAFT', 'CONTACTED', 'BILLED'].includes(upper)) return 'info';
  return defaultTone;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  success: { backgroundColor: '#E6F4EA' },
  successText: { color: colors.success },
  warning: { backgroundColor: '#FEF3D6' },
  warningText: { color: '#B47800' },
  danger: { backgroundColor: '#FCE8E6' },
  dangerText: { color: colors.danger },
  info: { backgroundColor: '#E8F0FE' },
  infoText: { color: '#1A73E8' },
  neutral: { backgroundColor: colors.mist },
  neutralText: { color: colors.slate },
  signature: { backgroundColor: '#FDF0E2' },
  signatureText: { color: colors.signature },
});
