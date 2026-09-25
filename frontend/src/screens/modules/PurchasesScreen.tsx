import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

export function PurchasesScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [purchases, setPurchases] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('100');

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<Record<string, unknown>[] | { items: Record<string, unknown>[] }>('/api/v1/purchases', {}, token);
      setPurchases(Array.isArray(res) ? res : res.items ?? []);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar órdenes de compra');
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPurchases();
  }, []);

  const handleCreatePurchase = async () => {
    if (!sku.trim() || !quantity.trim()) {
      onError('Especifica SKU y cantidad.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(
        '/api/v1/purchases',
        {
          method: 'POST',
          body: JSON.stringify({
            supplierName: supplierName.trim() || 'Proveedor General',
            items: [
              {
                sku: sku.trim().toUpperCase(),
                quantity: Number(quantity),
                unitPriceCents: Math.round(parseFloat(unitPrice) * 100),
              },
            ],
          }),
        },
        token
      );
      setIsModalOpen(false);
      setSupplierName('');
      setSku('');
      setQuantity('1');
      await loadPurchases();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al registrar orden de compra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'purchaseNumber', header: 'FOLIO COMPRA', width: 140 },
    { key: 'supplierName', header: 'PROVEEDOR', width: 220 },
    { key: 'status', header: 'ESTADO', align: 'center', render: (r) => <Badge label={String(r.status ?? 'PENDING')} /> },
    {
      key: 'totalCents',
      header: 'TOTAL ($)',
      align: 'right',
      render: (r) => <Text style={styles.money}>${((Number(r.totalCents) || 0) / 100).toFixed(2)}</Text>,
    },
    {
      key: 'createdAt',
      header: 'FECHA',
      width: 120,
      render: (r) => <Text style={styles.date}>{String(r.createdAt ?? '').slice(0, 10)}</Text>,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>Órdenes y Gestión de Compras</Text>
        <Button label="+ Nueva Orden de Compra" onPress={() => setIsModalOpen(true)} size="sm" />
      </View>

      <DataTable columns={columns} data={purchases} isLoading={isLoading} />

      <Modal onClose={() => setIsModalOpen(false)} title="Nueva Orden de Compra" visible={isModalOpen}>
        <Input label="Proveedor" onChangeText={setSupplierName} placeholder="Nombre del proveedor" value={supplierName} />
        <Input label="SKU del producto *" onChangeText={setSku} placeholder="EJ. SKU-001" value={sku} />
        <Input keyboardType="numeric" label="Cantidad *" onChangeText={setQuantity} placeholder="1" value={quantity} />
        <Input keyboardType="numeric" label="Precio Unitario ($) *" onChangeText={setUnitPrice} placeholder="100.00" value={unitPrice} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Guardar orden" onPress={() => void handleCreatePurchase()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, ...typography.title, fontSize: 16 },
  money: { color: colors.ink, ...typography.mono, fontWeight: '800' },
  date: { color: colors.muted, fontSize: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
});
