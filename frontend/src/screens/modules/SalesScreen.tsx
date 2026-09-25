import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

export function SalesScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [sales, setSales] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('150');

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<Record<string, unknown>[] | { items: Record<string, unknown>[] }>('/api/v1/sales', {}, token);
      setSales(Array.isArray(res) ? res : res.items ?? []);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar ventas');
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSales();
  }, []);

  const handleCreateSale = async () => {
    if (!sku.trim() || !quantity.trim()) {
      onError('Especifica SKU y cantidad.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(
        '/api/v1/sales',
        {
          method: 'POST',
          body: JSON.stringify({
            customerName: customerName.trim() || 'Cliente Mostrador',
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
      setCustomerName('');
      setSku('');
      setQuantity('1');
      await loadSales();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al registrar venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'saleNumber', header: 'FOLIO VENTA', width: 140 },
    { key: 'customerName', header: 'CLIENTE', width: 220 },
    { key: 'status', header: 'ESTADO', align: 'center', render: (r) => <Badge label={String(r.status ?? 'ORDER')} /> },
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
        <Text style={styles.sectionTitle}>Cotizaciones, Pedidos y Ventas</Text>
        <Button label="+ Nueva Venta / Cotización" onPress={() => setIsModalOpen(true)} size="sm" />
      </View>

      <DataTable columns={columns} data={sales} isLoading={isLoading} />

      <Modal onClose={() => setIsModalOpen(false)} title="Nueva Cotización / Pedido de Venta" visible={isModalOpen}>
        <Input label="Cliente" onChangeText={setCustomerName} placeholder="Nombre del cliente" value={customerName} />
        <Input label="SKU del producto *" onChangeText={setSku} placeholder="EJ. SKU-001" value={sku} />
        <Input keyboardType="numeric" label="Cantidad *" onChangeText={setQuantity} placeholder="1" value={quantity} />
        <Input keyboardType="numeric" label="Precio Venta ($) *" onChangeText={setUnitPrice} placeholder="150.00" value={unitPrice} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Guardar pedido" onPress={() => void handleCreateSale()} />
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
