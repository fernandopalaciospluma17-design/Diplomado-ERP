import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { colors, radii, spacing, typography } from '../design/tokens';
import { ApiError, apiRequest } from '../lib/api';

export function ConfirmAccountScreen({ token, onReturnToLogin }: { token: string; onReturnToLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const confirm = async () => {
    if (password.length < 8 || password.length > 128) {
      setError('La contraseña debe tener entre 8 y 128 caracteres.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest('/api/v1/auth/confirm-account', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setIsConfirmed(true);
    } catch (confirmError) {
      setError(confirmError instanceof ApiError ? confirmError.message : 'No se pudo confirmar la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.brandPanel}>
        <BrandMark />
        <View>
          <Text style={styles.kicker}>ACCESO SEGURO</Text>
          <Text style={styles.hero}>Activa tu cuenta de Nodara.</Text>
          <Text style={styles.heroBody}>Confirma tu invitación y configura una contraseña segura para comenzar.</Text>
        </View>
        <Text style={styles.brandFoot}>DIPLOMADO ERP / NODARA</Text>
      </View>
      <View style={styles.formPanel}>
        <View style={styles.formWrap}>
          <Text style={styles.formKicker}>{isConfirmed ? 'CUENTA CONFIRMADA' : 'CONFIGURAR CUENTA'}</Text>
          <Text style={styles.title}>{isConfirmed ? 'Ya puedes iniciar sesión' : 'Crea tu contraseña'}</Text>
          <Text style={styles.subtitle}>
            {isConfirmed ? 'Tu cuenta está activa. Inicia sesión con tu correo y la contraseña que acabas de crear.' : 'Usa al menos 8 caracteres. El enlace vence en 24 horas.'}
          </Text>
          {isConfirmed ? (
            <Pressable accessibilityRole="button" onPress={onReturnToLogin} style={styles.submit}>
              <Text style={styles.submitText}>Ir a iniciar sesión</Text>
            </Pressable>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput autoComplete="new-password" onChangeText={setPassword} placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} />
              <Text style={styles.label}>Confirmar contraseña</Text>
              <TextInput autoComplete="new-password" onChangeText={setPasswordConfirmation} onSubmitEditing={() => void confirm()} placeholder="Repite tu contraseña" placeholderTextColor={colors.muted} returnKeyType="done" secureTextEntry style={styles.input} value={passwordConfirmation} />
              {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => void confirm()} style={[styles.submit, isSubmitting && styles.disabled]}>
                {isSubmitting ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.submitText}>Confirmar cuenta</Text>}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.mist, flex: 1, flexDirection: 'row' },
  brandPanel: { backgroundColor: colors.ink, flex: 1, justifyContent: 'space-between', minHeight: '100%', padding: spacing.xxl },
  kicker: { color: colors.signature, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  hero: { color: colors.paper, ...typography.display, marginTop: spacing.md },
  heroBody: { color: '#B8C4BE', ...typography.body, fontSize: 16, marginTop: spacing.md, maxWidth: 360 },
  brandFoot: { color: '#7E8B85', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  formPanel: { alignItems: 'center', backgroundColor: colors.mist, flex: 1, justifyContent: 'center', padding: spacing.xl },
  formWrap: { maxWidth: 410, width: '100%' },
  formKicker: { color: colors.moss, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.ink, ...typography.display, fontSize: 28, marginTop: 8 },
  subtitle: { color: colors.muted, ...typography.body, marginTop: 10 },
  form: { marginTop: spacing.xl },
  label: { color: colors.slate, ...typography.label, marginBottom: 7, marginTop: spacing.md },
  input: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, color: colors.ink, fontSize: 15, height: 50, paddingHorizontal: 14 },
  error: { color: colors.danger, fontSize: 13, fontWeight: '600', marginTop: spacing.md },
  submit: { alignItems: 'center', backgroundColor: colors.signature, borderRadius: radii.sm, height: 52, justifyContent: 'center', marginTop: spacing.lg },
  submitText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.65 },
});
