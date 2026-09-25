import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

type Tab = 'stock' | 'movements' | 'transfer';

export function InventoryScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [tab, setTab] = useState<Tab>('stock');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Forms
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adjSku, setAdjSku] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('MAIN');
  const [adjType, setAdjType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjQty, setAdjQty] = useState('');
  const [adjRef, setAdjRef] = useState('');

  const loadData = async (activeTab = tab) => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'movements' ? '/api/v1/inventory/movements' : '/api/v1/inventory';
      const res = await apiRequest<Record<string, unknown>[] | { items: Record<string, unknown>[] }>(endpoint, {}, token);
      setData(Array.isArray(res) ? res : res.items ?? []);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar inventario');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData(tab);
  }, [tab]);

  const handlePostMovement = async () => {
    if (!adjSku.trim() || !adjQty.trim() || isNaN(Number(adjQty))) {
      onError('Especifica SKU y cantidad numérica válida.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(
        '/api/v1/inventory/movements',
        {
          method: 'POST',
          body: JSON.stringify({
            sku: adjSku.trim().toUpperCase(),
            warehouseCode: adjWarehouse.trim().toUpperCase() || 'MAIN',
            type: adjType,
            quantity: Number(adjQty),
            reference: adjRef.trim() || undefined,
          }),
        },
        token
      );
      setIsAdjModalOpen(false);
      setAdjSku('');
      setAdjQty('');
      setAdjRef('');
      await loadData(tab);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al registrar movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stockColumns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'sku', header: 'SKU / CÓDIGO', width: 140 },
    { key: 'warehouseCode', header: 'ALMACÉN', width: 110 },
    { key: 'quantityOnHand', header: 'EN EXISTENCIA', align: 'right', render: (r) => <Text style={styles.qtyText}>{String(r.quantityOnHand ?? 0)}</Text> },
    { key: 'quantityReserved', header: 'RESERVADO', align: 'right', render: (r) => <Text style={styles.mutedText}>{String(r.quantityReserved ?? 0)}</Text> },
    { key: 'quantityAvailable', header: 'DISPONIBLE', align: 'right', render: (r) => <Text style={styles.availText}>{String(r.quantityAvailable ?? 0)}</Text> },
  ];

  const movementColumns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'createdAt', header: 'FECHA', width: 150, render: (r) => <Text style={styles.dateText}>{String(r.createdAt ?? '').slice(0, 10)}</Text> },
    { key: 'sku', header: 'SKU', width: 120 },
    { key: 'type', header: 'TIPO', align: 'center', render: (r) => <Badge label={String(r.type ?? 'IN')} /> },
    { key: 'quantity', header: 'CANTIDAD', align: 'right', render: (r) => <Text style={styles.qtyText}>{String(r.quantity ?? 0)}</Text> },
    { key: 'warehouseCode', header: 'ALMACÉN', width: 100 },
    { key: 'reference', header: 'REFERENCIA', width: 160 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('stock')} style={[styles.tab, tab === 'stock' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'stock' && styles.tabTextActive]}>Existencias</Text>
          </Pressable>
          <Pressable onPress={() => setTab('movements')} style={[styles.tab, tab === 'movements' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'movements' && styles.tabTextActive]}>Movimientos</Text>
          </Pressable>
        </View>
        <Button label="+ Registrar movimiento" onPress={() => setIsAdjModalOpen(true)} size="sm" />
      </View>

      <DataTable
        columns={tab === 'stock' ? stockColumns : movementColumns}
        data={data}
        isLoading={isLoading}
      />

      <Modal onClose={() => setIsAdjModalOpen(false)} title="Registrar movimiento de stock" visible={isAdjModalOpen}>
        <Input label="SKU / Código de producto *" onChangeText={setAdjSku} placeholder="EJ. SKU-001" value={adjSku} />
        <Input label="Código de almacén *" onChangeText={setAdjWarehouse} placeholder="MAIN" value={adjWarehouse} />
        <Input label="Cantidad *" keyboardType="numeric" onChangeText={setAdjQty} placeholder="1" value={adjQty} />
        <Input label="Referencia / Motivo" onChangeText={setAdjRef} placeholder="Ajuste o nota de entrada" value={adjRef} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsAdjModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Registrar" onPress={() => void handlePostMovement()} />
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
  qtyText: { color: colors.ink, ...typography.mono, fontWeight: '800' },
  mutedText: { color: colors.muted, ...typography.mono },
  availText: { color: colors.moss, ...typography.mono, fontWeight: '800' },
  dateText: { color: colors.slate, fontSize: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
});
