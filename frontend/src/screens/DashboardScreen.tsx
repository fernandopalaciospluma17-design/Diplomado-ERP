import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Topbar } from '../components/Topbar';
import type { NodaraModule } from '../components/Sidebar';
import { colors, radii, spacing, typography } from '../design/tokens';

export type CurrentUser = { id: string; name: string; email: string; roleId?: string; companyId?: string; branchId?: string; status: string };
export type SummaryMetric = { totalCents: number; count: number };
export type DashboardSummary = { generatedAt: string; currency: string; sales: SummaryMetric; purchases: SummaryMetric; expenses: SummaryMetric; payments: SummaryMetric; reconciliation?: { ledgerBalanced: boolean; ledgerDebitCents: number; ledgerCreditCents: number; ledgerEntryCount: number } };

type Props = { user: CurrentUser; summary: DashboardSummary | null; apiStatus: string; error: string | null; selectedModule: string; moduleRows: Record<string, unknown>[]; moduleLoading: boolean; modules: NodaraModule[]; onSelectModule: (module: NodaraModule) => void; onRefresh: () => void; onLogout: () => void };

function money(cents: number, currency: string) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100); }
function rowLabel(row: Record<string, unknown>, index: number) { return String(row.code ?? row.productCode ?? row.saleNumber ?? row.purchaseNumber ?? row.employeeNumber ?? row.leadNumber ?? `Registro ${index + 1}`); }
function rowDescription(row: Record<string, unknown>) { return String(row.name ?? row.description ?? row.firstName ?? row.status ?? 'Registro operativo'); }

export function DashboardScreen({ user, summary, apiStatus, error, selectedModule, moduleRows, moduleLoading, modules, onSelectModule, onRefresh, onLogout }: Props) {
  const metrics = summary ? [
    { label: 'Ventas del periodo', value: money(summary.sales.totalCents, summary.currency), count: `${summary.sales.count} documentos`, tone: 'orange' },
    { label: 'Compras recibidas', value: money(summary.purchases.totalCents, summary.currency), count: `${summary.purchases.count} documentos`, tone: 'moss' },
    { label: 'Gastos registrados', value: money(summary.expenses.totalCents, summary.currency), count: `${summary.expenses.count} registros`, tone: 'slate' },
    { label: 'Pagos aplicados', value: money(summary.payments.totalCents, summary.currency), count: `${summary.payments.count} movimientos`, tone: 'ink' },
  ] : [];
  return (
    <View style={styles.main}>
      <Topbar apiStatus={apiStatus} onLogout={onLogout} onRefresh={onRefresh} userName={user.name} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}><View><Text style={styles.overline}>RESUMEN OPERATIVO</Text><Text style={styles.heading}>Buenos días, {user.name.split(' ')[0]}</Text><Text style={styles.subheading}>Aquí tienes una lectura rápida de tu operación.</Text></View><View style={styles.scope}><Text style={styles.scopeLabel}>SUCURSAL ACTIVA</Text><Text style={styles.scopeValue}>{user.branchId ?? 'Sin sucursal asignada'}</Text></View></View>
        {error ? <View accessibilityLiveRegion="polite" style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}
        <View style={styles.metricGrid}>{metrics.map((metric) => <View key={metric.label} style={styles.metric}><View style={[styles.metricMark, metric.tone === 'orange' && styles.orange, metric.tone === 'moss' && styles.moss, metric.tone === 'slate' && styles.slate, metric.tone === 'ink' && styles.ink]} /><Text style={styles.metricLabel}>{metric.label}</Text><Text style={styles.metricValue}>{metric.value}</Text><Text style={styles.metricCount}>{metric.count}</Text></View>)}</View>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{selectedModule === 'Resumen' ? 'Actividad reciente' : selectedModule}</Text><Text style={styles.sectionHint}>{selectedModule === 'Resumen' ? 'Selecciona un módulo para explorar datos reales.' : 'Información cargada desde la API del backend.'}</Text></View><Pressable onPress={onRefresh} style={styles.refresh}><Text style={styles.refreshText}>Actualizar</Text></Pressable></View>
        {selectedModule === 'Resumen' ? <View style={styles.emptyPanel}><View style={styles.emptyOrb}><Text style={styles.emptyOrbText}>N</Text></View><Text style={styles.emptyTitle}>Tu centro de operaciones está listo</Text><Text style={styles.emptyBody}>Los indicadores superiores provienen del resumen analítico. Abre un módulo para consultar sus registros protegidos por permisos del backend.</Text></View> : <View style={styles.modulePanel}>{moduleLoading ? <ActivityIndicator color={colors.signature} /> : moduleRows.length === 0 ? <Text style={styles.emptyBody}>No hay registros visibles para este módulo.</Text> : moduleRows.slice(0, 10).map((row, index) => <View key={`${rowLabel(row, index)}-${index}`} style={styles.moduleRow}><View style={styles.rowBadge}><Text style={styles.rowBadgeText}>{rowLabel(row, index).slice(0, 2)}</Text></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{rowLabel(row, index)}</Text><Text style={styles.rowDescription}>{rowDescription(row)}</Text></View><Text style={styles.rowStatus}>{String(row.status ?? 'ACTIVO')}</Text></View>)}</View>}
        <View style={styles.moduleStrip}>{modules.filter((module) => module.label !== 'Resumen').map((module) => <Pressable key={module.label} onPress={() => onSelectModule(module)} style={styles.moduleCard}><View style={styles.moduleCardTop}><Text style={styles.moduleShort}>{module.shortLabel}</Text><Text style={styles.moduleArrow}>→</Text></View><Text style={styles.moduleCardTitle}>{module.label}</Text><Text style={styles.moduleCardHint}>Abrir módulo</Text></Pressable>)}</View>
        {summary?.reconciliation ? <View style={styles.reconciliation}><View><Text style={styles.reconciliationLabel}>CONTROL CONTABLE</Text><Text style={styles.reconciliationTitle}>{summary.reconciliation.ledgerBalanced ? 'Ledger balanceado' : 'Requiere revisión'}</Text></View><Text style={styles.reconciliationValue}>{summary.reconciliation.ledgerEntryCount} asientos</Text></View> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { backgroundColor: colors.mist, flex: 1 },
  content: { padding: spacing.xl },
  greeting: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  overline: { color: colors.signature, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heading: { color: colors.ink, ...typography.display, fontSize: 30, marginTop: 7 },
  subheading: { color: colors.muted, ...typography.body, marginTop: 6 },
  scope: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11 },
  scopeLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  scopeValue: { color: colors.ink, ...typography.mono, marginTop: 4 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  metric: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, flexGrow: 1, minWidth: 190, padding: spacing.md, shadowColor: colors.shadow, shadowOpacity: 1 },
  metricMark: { borderRadius: 4, height: 8, marginBottom: 14, width: 28 },
  orange: { backgroundColor: colors.signature }, moss: { backgroundColor: colors.moss }, slate: { backgroundColor: colors.slate }, ink: { backgroundColor: colors.ink },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  metricValue: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 8 },
  metricCount: { color: colors.muted, fontSize: 12, marginTop: 6 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxl },
  sectionTitle: { color: colors.ink, ...typography.title },
  sectionHint: { color: colors.muted, fontSize: 13, marginTop: 5 },
  refresh: { borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  refreshText: { color: colors.slate, fontSize: 12, fontWeight: '800' },
  emptyPanel: { alignItems: 'center', backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  emptyOrb: { alignItems: 'center', backgroundColor: '#F9E8D5', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  emptyOrbText: { color: colors.signature, fontSize: 25, fontWeight: '900' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, maxWidth: 560, textAlign: 'center' },
  modulePanel: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, marginTop: spacing.md, padding: spacing.md },
  moduleRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 12 },
  rowBadge: { alignItems: 'center', backgroundColor: colors.mist, borderRadius: radii.sm, height: 34, justifyContent: 'center', width: 34 },
  rowBadgeText: { color: colors.moss, fontSize: 11, fontWeight: '800' },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rowDescription: { color: colors.muted, fontSize: 12, marginTop: 3 },
  rowStatus: { color: colors.moss, fontSize: 11, fontWeight: '800' },
  moduleStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  moduleCard: { backgroundColor: colors.slate, borderRadius: radii.md, flexGrow: 1, minWidth: 150, padding: spacing.md },
  moduleCardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  moduleShort: { color: colors.signature, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  moduleArrow: { color: colors.paper, fontSize: 18 },
  moduleCardTitle: { color: colors.paper, fontSize: 16, fontWeight: '800', marginTop: spacing.lg },
  moduleCardHint: { color: '#B6C3BC', fontSize: 12, marginTop: 4 },
  reconciliation: { alignItems: 'center', backgroundColor: '#E6F1EB', borderRadius: radii.md, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl, padding: spacing.md },
  reconciliationLabel: { color: colors.moss, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  reconciliationTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 4 },
  reconciliationValue: { color: colors.moss, ...typography.mono },
  errorBanner: { backgroundColor: '#FBE9E5', borderColor: '#F0C2B8', borderRadius: radii.sm, borderWidth: 1, marginTop: spacing.md, padding: spacing.md },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});
