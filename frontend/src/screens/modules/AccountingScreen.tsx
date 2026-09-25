import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

type Tab = 'trial' | 'accounts' | 'entries';

export function AccountingScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [tab, setTab] = useState<Tab>('trial');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [concept, setConcept] = useState('');
  const [debitAccount, setDebitAccount] = useState('1010');
  const [creditAccount, setCreditAccount] = useState('4010');
  const [amount, setAmount] = useState('1000');

  const loadData = async (activeTab = tab) => {
    setIsLoading(true);
    try {
      let endpoint = '/api/v1/accounting/trial-balance';
      if (activeTab === 'accounts') endpoint = '/api/v1/accounting/chart-of-accounts';
      if (activeTab === 'entries') endpoint = '/api/v1/accounting/entries';

      const res = await apiRequest<Record<string, unknown>[] | { items: Record<string, unknown>[] }>(endpoint, {}, token);
      setData(Array.isArray(res) ? res : res.items ?? []);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar contabilidad');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData(tab);
  }, [tab]);

  const handlePostEntry = async () => {
    if (!concept.trim() || !amount.trim() || isNaN(Number(amount))) {
      onError('Especifica concepto y monto numérico válido.');
      return;
    }
    setIsSubmitting(true);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      await apiRequest(
        '/api/v1/accounting/entries',
        {
          method: 'POST',
          body: JSON.stringify({
            date: new Date().toISOString().slice(0, 10),
            concept: concept.trim(),
            lines: [
              { accountCode: debitAccount.trim(), debitCents: cents, creditCents: 0 },
              { accountCode: creditAccount.trim(), debitCents: 0, creditCents: cents },
            ],
          }),
        },
        token
      );
      setIsModalOpen(false);
      setConcept('');
      setAmount('1000');
      await loadData(tab);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al registrar asiento contable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const trialColumns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'accountCode', header: 'CUENTA', width: 110 },
    { key: 'accountName', header: 'NOMBRE DE LA CUENTA', width: 220 },
    {
      key: 'debitCents',
      header: 'DÉBITOS ($)',
      align: 'right',
      render: (r) => <Text style={styles.money}>${((Number(r.debitCents) || 0) / 100).toFixed(2)}</Text>,
    },
    {
      key: 'creditCents',
      header: 'CRÉDITOS ($)',
      align: 'right',
      render: (r) => <Text style={styles.money}>${((Number(r.creditCents) || 0) / 100).toFixed(2)}</Text>,
    },
    {
      key: 'balanceCents',
      header: 'SALDO NETO ($)',
      align: 'right',
      render: (r) => <Text style={styles.netMoney}>${((Number(r.balanceCents) || 0) / 100).toFixed(2)}</Text>,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('trial')} style={[styles.tab, tab === 'trial' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'trial' && styles.tabTextActive]}>Balance de Comprobación</Text>
          </Pressable>
          <Pressable onPress={() => setTab('accounts')} style={[styles.tab, tab === 'accounts' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'accounts' && styles.tabTextActive]}>Catálogo de Cuentas</Text>
          </Pressable>
          <Pressable onPress={() => setTab('entries')} style={[styles.tab, tab === 'entries' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'entries' && styles.tabTextActive]}>Diario General</Text>
          </Pressable>
        </View>
        <Button label="+ Nuevo Asiento Manual" onPress={() => setIsModalOpen(true)} size="sm" />
      </View>

      <DataTable columns={trialColumns} data={data} isLoading={isLoading} />

      <Modal onClose={() => setIsModalOpen(false)} title="Nuevo Asiento Contable Manual" visible={isModalOpen}>
        <Input label="Concepto / Descripción *" onChangeText={setConcept} placeholder="Poliza de ajuste o registro manual" value={concept} />
        <Input label="Cuenta Débito (Cargo) *" onChangeText={setDebitAccount} placeholder="1010" value={debitAccount} />
        <Input label="Cuenta Crédito (Abono) *" onChangeText={setCreditAccount} placeholder="4010" value={creditAccount} />
        <Input keyboardType="numeric" label="Monto ($) *" onChangeText={setAmount} placeholder="1000.00" value={amount} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Polizar Asiento" onPress={() => void handlePostEntry()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: colors.paper, padding: 4, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.sm },
  tabActive: { backgroundColor: colors.slate },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: colors.paper },
  money: { color: colors.ink, ...typography.mono },
  netMoney: { color: colors.moss, ...typography.mono, fontWeight: '800' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
});
