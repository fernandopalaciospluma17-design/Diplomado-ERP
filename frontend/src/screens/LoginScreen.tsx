import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { colors, radii, spacing, typography } from '../design/tokens';

export function LoginScreen({ email, password, error, isSubmitting, onEmailChange, onPasswordChange, onSubmit }: { email: string; password: string; error: string | null; isSubmitting: boolean; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.brandPanel}><View style={styles.brand}><BrandMark /></View><View style={styles.brandCopy}><Text style={styles.kicker}>OPERACIÓN CLARA</Text><Text style={styles.hero}>Tu negocio, en una sola vista.</Text><Text style={styles.heroBody}>Nodara conecta tus operaciones diarias con información confiable para decidir mejor.</Text></View><Text style={styles.brandFoot}>DIPLOMADO ERP / NODARA</Text></View>
      <View style={styles.formPanel}>
        <View style={styles.formWrap}>
          <Text style={styles.formKicker}>ACCESO SEGURO</Text>
          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>Ingresa con tu cuenta empresarial para continuar.</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" onChangeText={onEmailChange} placeholder="nombre@empresa.com" placeholderTextColor={colors.muted} style={styles.input} value={email} />
            <Text style={styles.label}>Contraseña</Text>
            <TextInput autoComplete="password" onChangeText={onPasswordChange} placeholder="Tu contraseña" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} />
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={onSubmit} style={[styles.submit, isSubmitting && styles.disabled]}>{isSubmitting ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.submitText}>Entrar a Nodara</Text>}</Pressable>
          </View>
          <Text style={styles.help}>Tu sesión se valida contra el backend empresarial y se conserva de forma segura en este dispositivo.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.mist, flex: 1, flexDirection: 'row' },
  brandPanel: { backgroundColor: colors.ink, flex: 1, justifyContent: 'space-between', minHeight: '100%', padding: spacing.xxl },
  brand: { marginBottom: spacing.xxl },
  brandCopy: { maxWidth: 440 },
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
  help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.xl },
});
