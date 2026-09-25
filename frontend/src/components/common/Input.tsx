import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radii, typography } from '../../design/tokens';

type InputProps = TextInputProps & {
  label?: string;
  error?: string | null;
  helperText?: string;
};

export function Input({ label, error, helperText, style, ...props }: InputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, width: '100%' },
  label: { color: colors.slate, ...typography.label, marginBottom: 6 },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    height: 44,
    paddingHorizontal: 12,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '600', marginTop: 4 },
  helperText: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
