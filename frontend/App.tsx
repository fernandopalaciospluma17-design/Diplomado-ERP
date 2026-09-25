import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Sidebar, type NodaraModule } from './src/components/Sidebar';
import { colors } from './src/design/tokens';
import { ApiError, apiRequest, clearSessionToken, readSessionToken, writeSessionToken } from './src/lib/api';
import { DashboardScreen, type CurrentUser, type DashboardSummary } from './src/screens/DashboardScreen';
import { LoginScreen } from './src/screens/LoginScreen';

const modules: NodaraModule[] = [
  { label: 'Resumen', shortLabel: 'IN', endpoint: null },
  { label: 'Inventario', shortLabel: 'IV', endpoint: '/api/v1/master-data/products?page=1&limit=8' },
  { label: 'Ventas', shortLabel: 'VT', endpoint: '/api/v1/sales' },
  { label: 'Compras', shortLabel: 'CP', endpoint: '/api/v1/purchases' },
  { label: 'Finanzas', shortLabel: 'FN', endpoint: '/api/v1/accounting/trial-balance' },
  { label: 'CRM', shortLabel: 'CR', endpoint: '/api/v1/crm/leads' },
  { label: 'RRHH', shortLabel: 'RH', endpoint: '/api/v1/hr/employees' },
  { label: 'POS', shortLabel: 'PS', endpoint: '/api/v1/pos/sessions' },
];

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedModule, setSelectedModule] = useState('Resumen');
  const [moduleRows, setModuleRows] = useState<Record<string, unknown>[]>([]);
  const [apiStatus, setApiStatus] = useState('Comprobando API');
  const [error, setError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);

  const logout = async () => {
    await clearSessionToken();
    setToken(null);
    setUser(null);
    setSummary(null);
    setModuleRows([]);
    setSelectedModule('Resumen');
    setError(null);
  };

  const checkApi = async () => {
    try {
      await apiRequest<{ status: string }>('/api/v1/health');
      setApiStatus('API operativa');
    } catch {
      setApiStatus('API no disponible');
    }
  };

  const loadDashboard = async (accessToken: string) => {
    const data = await apiRequest<DashboardSummary>('/api/v1/reports/summary', {}, accessToken);
    setSummary(data);
  };

  const loadCurrentUser = async (accessToken: string) => {
    const data = await apiRequest<CurrentUser>('/api/v1/auth/me', {}, accessToken);
    setUser(data);
    await loadDashboard(accessToken);
  };

  const restore = async () => {
    try {
      const saved = await readSessionToken();
      if (saved) {
        setToken(saved);
        await loadCurrentUser(saved);
      }
    } catch (restoreError) {
      if (restoreError instanceof ApiError && restoreError.status === 401) await logout();
      else setError('No se pudo restaurar la sesión. Intenta iniciar sesión nuevamente.');
    } finally {
      setIsBooting(false);
    }
  };

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Introduce correo y contraseña para continuar.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await apiRequest<{ accessToken: string }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
      await writeSessionToken(data.accessToken);
      setToken(data.accessToken);
      await loadCurrentUser(data.accessToken);
    } catch (loginError) {
      setError(loginError instanceof ApiError ? loginError.message : 'No se pudo iniciar sesión');
      await clearSessionToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refresh = async () => {
    await checkApi();
    if (!token) return;
    try {
      setError(null);
      await loadCurrentUser(token);
      if (selectedModule !== 'Resumen') await loadModule(modules.find((module) => module.label === selectedModule) ?? modules[0]!, token);
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) await logout();
      else setError(refreshError instanceof Error ? refreshError.message : 'No se pudieron actualizar los datos');
    }
  };

  const loadModule = async (module: NodaraModule, accessToken = token) => {
    setSelectedModule(module.label);
    setError(null);
    if (!module.endpoint || !accessToken) {
      setModuleRows([]);
      return;
    }
    setModuleLoading(true);
    try {
      const data = await apiRequest<unknown>(module.endpoint, {}, accessToken);
      const source = data as { items?: unknown[] };
      setModuleRows(Array.isArray(data) ? data as Record<string, unknown>[] : Array.isArray(source.items) ? source.items as Record<string, unknown>[] : []);
    } catch (moduleError) {
      if (moduleError instanceof ApiError && moduleError.status === 401) await logout();
      else setError(moduleError instanceof Error ? moduleError.message : 'No se pudo cargar el módulo');
      setModuleRows([]);
    } finally {
      setModuleLoading(false);
    }
  };

  useEffect(() => {
    void checkApi();
    void restore();
  }, []);

  if (isBooting) {
    return <View style={styles.boot}><ActivityIndicator color={colors.signature} /><Text style={styles.bootText}>Preparando Nodara...</Text></View>;
  }

  if (!user || !token) {
    return <><LoginScreen email={email} error={error} isSubmitting={isSubmitting} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={() => void login()} password={password} /><StatusBar style="light" /></>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <Sidebar compact={compact} modules={modules} onLogout={() => void logout()} onSelect={(module) => void loadModule(module)} selected={selectedModule} userName={user.name} />
        <DashboardScreen apiStatus={apiStatus} error={error} moduleLoading={moduleLoading} moduleRows={moduleRows} modules={modules} onLogout={() => void logout()} onRefresh={() => void refresh()} onSelectModule={(module) => void loadModule(module)} selectedModule={selectedModule} summary={summary} user={user} />
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.mist, flex: 1 },
  shell: { flex: 1, flexDirection: 'row' },
  shellCompact: { flexDirection: 'column' },
  boot: { alignItems: 'center', backgroundColor: colors.ink, flex: 1, justifyContent: 'center' },
  bootText: { color: colors.paper, fontSize: 14, fontWeight: '700', marginTop: 12 },
});
