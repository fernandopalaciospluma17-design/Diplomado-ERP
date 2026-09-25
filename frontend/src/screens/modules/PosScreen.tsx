import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

export function PosScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Open Session
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [terminalCode, setTerminalCode] = useState('POS-01');
  const [openingBalance, setOpeningBalance] = useState('1000');

  // Form Ticket
  const [activeSessionNum, setActiveSessionNum] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceCents, setPriceCents] = useState('100');

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<Record<string, unknown>[] | { items: Record<string, unknown>[] }>('/api/v1/pos/sessions', {}, token);
      const items = Array.isArray(res) ? res : res.items ?? [];
      setSessions(items);
      const openSession = items.find((s) => s.status === 'OPEN');
      if (openSession) {
        setActiveSessionNum(String(openSession.sessionNumber));
      } else {
        setActiveSessionNum(null);
      }
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar sesiones POS');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const handleOpenSession = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest(
        '/api/v1/pos/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            terminalCode: terminalCode.trim().toUpperCase() || 'POS-01',
            openingBalanceCents: Math.round(parseFloat(openingBalance) * 100),
          }),
        },
        token
      );
      setIsOpenModalOpen(false);
      await loadSessions();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al abrir caja POS');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!activeSessionNum || !sku.trim()) {
      onError('Abre una caja y especifica SKU.');
      return;
    }
    setIsSubmitting(true);
    try {
      const idempotencyKey = `POS-TICKET-${Date.now()}`;
      await apiRequest(
        '/api/v1/pos/tickets',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify({
            sessionNumber: activeSessionNum,
            items: [
              {
                sku: sku.trim().toUpperCase(),
                quantity: Number(quantity),
                unitPriceCents: Math.round(parseFloat(priceCents) * 100),
              },
            ],
            paymentMethod: 'CASH',
            amountPaidCents: Math.round(parseFloat(priceCents) * Number(quantity) * 100),
          }),
        },
        token
      );
      setIsTicketModalOpen(false);
      setSku('');
      await loadSessions();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al emitir ticket de venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'sessionNumber', header: 'SESIÓN', width: 140 },
    { key: 'terminalCode', header: 'TERMINAL', width: 120 },
    { key: 'status', header: 'ESTADO', align: 'center', render: (r) => <Badge label={String(r.status ?? 'OPEN')} /> },
    {
      key: 'openingBalanceCents',
      header: 'FONDO INICIAL',
      align: 'right',
      render: (r) => <Text style={styles.money}>${((Number(r.openingBalanceCents) || 0) / 100).toFixed(2)}</Text>,
    },
    {
      key: 'currentBalanceCents',
      header: 'SALDO CAJA',
      align: 'right',
      render: (r) => <Text style={styles.moneyBold}>${((Number(r.currentBalanceCents) || 0) / 100).toFixed(2)}</Text>,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.statusBanner}>
        <View>
          <Text style={styles.bannerOverline}>PUNTO DE VENTA (POS)</Text>
          <Text style={styles.bannerTitle}>
            {activeSessionNum ? `Caja activa: ${activeSessionNum}` : 'No hay caja abierta'}
          </Text>
        </View>
        <View style={styles.bannerActions}>
          {activeSessionNum ? (
            <Button label="⚡ Cobro Rápido (Ticket)" onPress={() => setIsTicketModalOpen(true)} size="sm" />
          ) : (
            <Button label="🔓 Abrir Caja POS" onPress={() => setIsOpenModalOpen(true)} size="sm" />
          )}
        </View>
      </View>

      <DataTable columns={columns} data={sessions} isLoading={isLoading} />

      <Modal onClose={() => setIsOpenModalOpen(false)} title="Abrir Sesión de Caja POS" visible={isOpenModalOpen}>
        <Input label="Código de Terminal / Caja *" onChangeText={setTerminalCode} value={terminalCode} />
        <Input keyboardType="numeric" label="Fondo Inicial ($) *" onChangeText={setOpeningBalance} value={openingBalance} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsOpenModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Abrir caja" onPress={() => void handleOpenSession()} />
        </View>
      </Modal>

      <Modal onClose={() => setIsTicketModalOpen(false)} title={`Cobro Rápido - Caja ${activeSessionNum}`} visible={isTicketModalOpen}>
        <Input label="SKU del producto *" onChangeText={setSku} placeholder="EJ. SKU-001" value={sku} />
        <Input keyboardType="numeric" label="Cantidad *" onChangeText={setQuantity} value={quantity} />
        <Input keyboardType="numeric" label="Precio ($) *" onChangeText={setPriceCents} value={priceCents} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsTicketModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Emitir Ticket & Cobrar" onPress={() => void handleCreateTicket()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: spacing.md },
  statusBanner: {
    backgroundColor: colors.slate,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bannerOverline: { color: colors.signature, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  bannerTitle: { color: colors.paper, fontSize: 16, fontWeight: '800', marginTop: 4 },
  bannerActions: { flexDirection: 'row', gap: 8 },
  money: { color: colors.ink, ...typography.mono },
  moneyBold: { color: colors.moss, ...typography.mono, fontWeight: '800' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
});
