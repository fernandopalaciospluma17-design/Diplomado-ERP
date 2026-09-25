import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, typography } from '../../design/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function Button({ label, onPress, variant = 'primary', isLoading = false, disabled = false, icon, size = 'md' }: ButtonProps) {
  const isDisabled = disabled || isLoading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.btn,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.ink : colors.paper} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], styles[`text_${size}`]]}>
          {icon ? `${icon}  ` : ''}{label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
  },
  size_sm: { height: 34, paddingHorizontal: 12 },
  size_md: { height: 42, paddingHorizontal: 16 },
  size_lg: { height: 48, paddingHorizontal: 20 },
  primary: { backgroundColor: colors.signature },
  primaryText: { color: colors.ink, fontWeight: '800' },
  secondary: { backgroundColor: colors.slate },
  secondaryText: { color: colors.paper, fontWeight: '700' },
  outline: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  outlineText: { color: colors.slate, fontWeight: '700' },
  danger: { backgroundColor: colors.danger },
  dangerText: { color: colors.paper, fontWeight: '800' },
  ghost: { backgroundColor: 'transparent' },
  ghostText: { color: colors.moss, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  text: { ...typography.label },
  text_sm: { fontSize: 12 },
  text_md: { fontSize: 13 },
  text_lg: { fontSize: 14 },
});
