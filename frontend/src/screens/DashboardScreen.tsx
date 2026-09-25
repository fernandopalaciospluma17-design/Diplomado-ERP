import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Topbar } from '../components/Topbar';
import type { NodaraModule } from '../components/Sidebar';
import { NotificationDrawer } from '../components/common/NotificationDrawer';
import { MasterDataScreen } from './modules/MasterDataScreen';
import { InventoryScreen } from './modules/InventoryScreen';
import { PurchasesScreen } from './modules/PurchasesScreen';
import { SalesScreen } from './modules/SalesScreen';
import { AccountingScreen } from './modules/AccountingScreen';
import { CrmScreen } from './modules/CrmScreen';
import { PosScreen } from './modules/PosScreen';
import { HrScreen } from './modules/HrScreen';
import type { CurrentUser, DashboardSummary, NotificationItem } from '../types';
import { colors, radii, spacing, typography } from '../design/tokens';

type Props = {
  user: CurrentUser;
  summary: DashboardSummary | null;
  apiStatus: string;
  error: string | null;
  selectedModule: string;
  modules: NodaraModule[];
  token: string;
  onSelectModule: (module: NodaraModule) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onError: (msg: string) => void;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export function DashboardScreen({
  user,
  summary,
  apiStatus,
  error,
  selectedModule,
  modules,
  token,
  onSelectModule,
  onRefresh,
  onLogout,
  onError,
}: Props) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Sistema iniciado',
      message: 'Nodara ERP se ha conectado correctamente al backend empresarial.',
      timestamp: 'Ahora',
      read: false,
      type: 'info',
    },
    {
      id: '2',
      title: 'Control Contable',
      message: 'Ledger de doble partida conciliado y balance de comprobación actualizado.',
      timestamp: 'Hace 5m',
      read: false,
      type: 'success',
    },
  ]);

  const metrics = summary
    ? [
        {
          label: 'Ventas del periodo',
          value: money(summary.sales.totalCents, summary.currency),
          count: `${summary.sales.count} documentos`,
          tone: 'orange',
          moduleTarget: 'Ventas',
        },
        {
          label: 'Compras recibidas',
          value: money(summary.purchases.totalCents, summary.currency),
          count: `${summary.purchases.count} documentos`,
          tone: 'moss',
          moduleTarget: 'Compras',
        },
        {
          label: 'Gastos registrados',
          value: money(summary.expenses.totalCents, summary.currency),
          count: `${summary.expenses.count} registros`,
          tone: 'slate',
          moduleTarget: 'Finanzas',
        },
        {
          label: 'Pagos aplicados',
          value: money(summary.payments.totalCents, summary.currency),
          count: `${summary.payments.count} movimientos`,
          tone: 'ink',
          moduleTarget: 'Finanzas',
        },
      ]
    : [];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.main}>
      <Topbar
        apiStatus={apiStatus}
        onLogout={onLogout}
        onOpenNotifications={() => {
          setIsNotifOpen(true);
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onRefresh={onRefresh}
        unreadNotificationsCount={unreadCount}
        user={user}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header greeting */}
        <View style={styles.greeting}>
          <View>
            <Text style={styles.overline}>PLATAFORMA EMPRESARIAL NODARA</Text>
            <Text style={styles.heading}>Buenos días, {user.name.split(' ')[0]}</Text>
            <Text style={styles.subheading}>
              {user.company?.name ?? 'Empresa Activa'} • {user.branch?.name ?? 'Sucursal Activa'}
            </Text>
          </View>
        </View>

        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Dynamic Module Content */}
        {selectedModule === 'Maestros' ? (
          <MasterDataScreen onError={onError} token={token} />
        ) : selectedModule === 'Inventario' ? (
          <InventoryScreen onError={onError} token={token} />
        ) : selectedModule === 'Compras' ? (
          <PurchasesScreen onError={onError} token={token} />
        ) : selectedModule === 'Ventas' ? (
          <SalesScreen onError={onError} token={token} />
        ) : selectedModule === 'Finanzas' ? (
          <AccountingScreen onError={onError} token={token} />
        ) : selectedModule === 'CRM' ? (
          <CrmScreen onError={onError} token={token} />
        ) : selectedModule === 'POS' ? (
          <PosScreen onError={onError} token={token} />
        ) : selectedModule === 'RRHH' ? (
          <HrScreen onError={onError} token={token} />
        ) : (
          /* Default: Resumen / Dashboard Overview */
          <>
            {/* KPI Cards Grid */}
            <View style={styles.metricGrid}>
              {metrics.map((metric) => (
                <Pressable
                  key={metric.label}
                  onPress={() => {
                    const found = modules.find((m) => m.label === metric.moduleTarget);
                    if (found) onSelectModule(found);
                  }}
                  style={styles.metric}
                >
                  <View
                    style={[
                      styles.metricMark,
                      metric.tone === 'orange' && styles.orange,
                      metric.tone === 'moss' && styles.moss,
                      metric.tone === 'slate' && styles.slate,
                      metric.tone === 'ink' && styles.ink,
                    ]}
                  />
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricCount}>{metric.count} →</Text>
                </Pressable>
              ))}
            </View>

            {/* Quick Module Strip */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Módulos ERP Integrados</Text>
                <Text style={styles.sectionHint}>Haz clic en cualquier dominio para gestionar registros reales.</Text>
              </View>
            </View>

            <View style={styles.moduleStrip}>
              {modules
                .filter((m) => m.label !== 'Resumen')
                .map((module) => (
                  <Pressable key={module.label} onPress={() => onSelectModule(module)} style={styles.moduleCard}>
                    <View style={styles.moduleCardTop}>
                      <Text style={styles.moduleShort}>{module.shortLabel}</Text>
                      <Text style={styles.moduleArrow}>→</Text>
                    </View>
                    <Text style={styles.moduleCardTitle}>{module.label}</Text>
                    <Text style={styles.moduleCardHint}>Abrir gestión</Text>
                  </Pressable>
                ))}
            </View>

            {/* Ledger reconciliation status card */}
            {summary?.reconciliation ? (
              <View style={styles.reconciliation}>
                <View>
                  <Text style={styles.reconciliationLabel}>CONTROL CONTABLE DE PARTIDA DOBLE</Text>
                  <Text style={styles.reconciliationTitle}>
                    {summary.reconciliation.ledgerBalanced ? '✓ Ledger Contable Cuadrado y Auditado' : '⚠️ Requiere revisión de balance'}
                  </Text>
                </View>
                <Text style={styles.reconciliationValue}>{summary.reconciliation.ledgerEntryCount} Asientos en Diario</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <NotificationDrawer
        notifications={notifications}
        onClearAll={() => setNotifications([])}
        onClose={() => setIsNotifOpen(false)}
        visible={isNotifOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  main: { backgroundColor: colors.mist, flex: 1 },
  content: { padding: spacing.xl },
  greeting: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  overline: { color: colors.signature, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heading: { color: colors.ink, ...typography.display, fontSize: 26, marginTop: 4 },
  subheading: { color: colors.muted, ...typography.body, marginTop: 4 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg },
  metric: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 200,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
  },
  metricMark: { borderRadius: 4, height: 8, marginBottom: 12, width: 28 },
  orange: { backgroundColor: colors.signature },
  moss: { backgroundColor: colors.moss },
  slate: { backgroundColor: colors.slate },
  ink: { backgroundColor: colors.ink },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  metricValue: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 6 },
  metricCount: { color: colors.moss, fontSize: 12, fontWeight: '700', marginTop: 6 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  sectionTitle: { color: colors.ink, ...typography.title, fontSize: 18 },
  sectionHint: { color: colors.muted, fontSize: 13, marginTop: 4 },
  moduleStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  moduleCard: { backgroundColor: colors.slate, borderRadius: radii.md, flexGrow: 1, minWidth: 160, padding: spacing.md },
  moduleCardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  moduleShort: { color: colors.signature, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  moduleArrow: { color: colors.paper, fontSize: 18 },
  moduleCardTitle: { color: colors.paper, fontSize: 16, fontWeight: '800', marginTop: spacing.md },
  moduleCardHint: { color: '#B6C3BC', fontSize: 12, marginTop: 4 },
  reconciliation: {
    alignItems: 'center',
    backgroundColor: '#E6F1EB',
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#C3E2D1',
  },
  reconciliationLabel: { color: colors.moss, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  reconciliationTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 4 },
  reconciliationValue: { color: colors.moss, ...typography.mono, fontWeight: '800' },
  errorBanner: {
    backgroundColor: '#FBE9E5',
    borderColor: '#F0C2B8',
    borderRadius: radii.sm,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});
