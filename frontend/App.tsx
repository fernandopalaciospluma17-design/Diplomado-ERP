import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Sidebar, type NodaraModule } from './src/components/Sidebar';
import { colors } from './src/design/tokens';
import { ApiError, apiRequest, clearSessionToken, readSessionToken, subscribeToUnauthorized, writeSessionToken } from './src/lib/api';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ConfirmAccountScreen } from './src/screens/ConfirmAccountScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import type { CurrentUser, DashboardSummary } from './src/types';

const modules: NodaraModule[] = [
  { label: 'Resumen', shortLabel: 'IN', endpoint: null },
  { label: 'Maestros', shortLabel: 'MS', endpoint: '/api/v1/master-data/products', permission: 'master-data.products.read' },
  { label: 'Inventario', shortLabel: 'IV', endpoint: '/api/v1/inventory', permission: 'inventory.stock.read' },
  { label: 'Ventas', shortLabel: 'VT', endpoint: '/api/v1/sales', permission: 'sales.sale.read' },
  { label: 'Compras', shortLabel: 'CP', endpoint: '/api/v1/purchases', permission: 'purchases.purchase.read' },
  { label: 'Finanzas', shortLabel: 'FN', endpoint: '/api/v1/accounting/trial-balance', permission: 'finance.report.read' },
  { label: 'CRM', shortLabel: 'CR', endpoint: '/api/v1/crm/leads', permission: 'crm.lead.read' },
  { label: 'POS', shortLabel: 'PS', endpoint: '/api/v1/pos/sessions', permission: 'pos.session.read' },
  { label: 'RRHH', shortLabel: 'RH', endpoint: '/api/v1/hr/employees', permission: 'hr.employee.read' },
  { label: 'Usuarios', shortLabel: 'US', endpoint: null, permission: 'platform.users.read' },
];

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedModule, setSelectedModule] = useState('Resumen');
  const [apiStatus, setApiStatus] = useState('Comprobando API');
  const [error, setError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logout = async (revokeRemote = true) => {
    let revocationFailed = false;
    if (revokeRemote && token) {
      try {
        await apiRequest('/api/v1/core/sessions/current', { method: 'DELETE' }, token, false);
      } catch {
        revocationFailed = true;
      }
    }
    await clearSessionToken();
    setToken(null);
    setUser(null);
    setSummary(null);
    setSelectedModule('Resumen');
    setError(revocationFailed ? 'Se cerró la sesión en este dispositivo, pero no se pudo confirmar la revocación remota.' : null);
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
    try {
      await loadDashboard(accessToken);
    } catch (dashboardError) {
      setSummary(null);
      if (dashboardError instanceof ApiError && dashboardError.status === 401) throw dashboardError;
      setError(dashboardError instanceof ApiError
        ? dashboardError.message
        : 'No se pudo cargar el resumen. Puedes continuar usando los módulos autorizados.');
    }
  };

  const restore = async () => {
    try {
      const saved = await readSessionToken();
      if (saved) {
        setToken(saved);
        await loadCurrentUser(saved);
      }
    } catch (restoreError) {
      if (restoreError instanceof ApiError && restoreError.status === 401) {
        await logout(false);
      } else {
        setError('No se pudo restaurar la sesión. Intenta iniciar sesión nuevamente.');
      }
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
      const data = await apiRequest<{ accessToken: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
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
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) {
        await logout(false);
      } else {
        setError(refreshError instanceof Error ? refreshError.message : 'No se pudieron actualizar los datos');
      }
    }
  };

  const handleSelectModule = (module: NodaraModule) => {
    setSelectedModule(module.label);
    setError(null);
  };

  useEffect(() => {
    void checkApi();
    void (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        const linkToken = initialUrl ? new URL(initialUrl).searchParams.get('confirm') : null;
        if (linkToken) {
          setConfirmationToken(linkToken);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          await restore();
        }
      } catch {
        setError('No se pudo procesar el enlace. Intenta abrirlo nuevamente.');
        await restore();
      } finally {
        setIsBooting(false);
      }
    })();
  }, []);

  useEffect(() => subscribeToUnauthorized(() => void logout(false)), []);

  const visibleModules = modules.filter((module) =>
    !module.permission || user?.permissions?.includes(module.permission)
  );

  if (isBooting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.signature} size="large" />
        <Text style={styles.bootText}>Iniciando Nodara ERP...</Text>
      </View>
    );
  }

  if (confirmationToken) {
    return (
      <>
        <ConfirmAccountScreen token={confirmationToken} onReturnToLogin={() => setConfirmationToken(null)} />
        <StatusBar style="light" />
      </>
    );
  }

  if (!user || !token) {
    return (
      <>
        <LoginScreen
          email={email}
          error={error}
          isSubmitting={isSubmitting}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={() => void login()}
          password={password}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <Sidebar
          compact={compact}
          modules={visibleModules}
          onLogout={() => void logout()}
          onSelect={handleSelectModule}
          selected={selectedModule}
          user={user}
        />
        <DashboardScreen
          apiStatus={apiStatus}
          error={error}
          modules={visibleModules}
          onError={(msg) => setError(msg)}
          onLogout={() => void logout()}
          onRefresh={() => void refresh()}
          onSelectModule={handleSelectModule}
          selectedModule={selectedModule}
          summary={summary}
          token={token}
          user={user}
        />
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
