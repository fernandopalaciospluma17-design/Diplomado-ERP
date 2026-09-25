import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';
import type { MasterProduct, PaginatedResponse } from '../../types';

type Tab = 'products' | 'customers' | 'suppliers' | 'warehouses';

export function MasterDataScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [tab, setTab] = useState<Tab>('products');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPriceCents, setFormPriceCents] = useState('');
  const [formCostCents, setFormCostCents] = useState('');

  const loadData = async (activeTab = tab, activePage = page) => {
    setIsLoading(true);
    try {
      let endpoint = '/api/v1/master-data/products';
      if (activeTab === 'customers') endpoint = '/api/v1/master-data/customers';
      if (activeTab === 'suppliers') endpoint = '/api/v1/master-data/suppliers';
      if (activeTab === 'warehouses') endpoint = '/api/v1/master-data/warehouses';

      const query = `?page=${activePage}&limit=10${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await apiRequest<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(
        `${endpoint}${query}`,
        {},
        token
      );

      if (Array.isArray(res)) {
        setData(res);
        setTotalPages(1);
      } else if (res && Array.isArray(res.items)) {
        setData(res.items);
        setTotalPages(res.meta?.pages ?? 1);
      } else {
        setData([]);
      }
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar datos maestros');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData(tab, page);
  }, [tab, page]);

  const handleCreateProduct = async () => {
    if (!formCode.trim() || !formName.trim()) {
      onError('El código y nombre son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(
        '/api/v1/master-data/products',
        {
          method: 'POST',
          body: JSON.stringify({
            code: formCode.trim().toUpperCase(),
            name: formName.trim(),
            category: formCategory.trim() || undefined,
            priceCents: formPriceCents ? Math.round(parseFloat(formPriceCents) * 100) : 0,
            costCents: formCostCents ? Math.round(parseFloat(formCostCents) * 100) : 0,
            status: 'ACTIVE',
          }),
        },
        token
      );
      setIsModalOpen(false);
      setFormCode('');
      setFormName('');
      setFormCategory('');
      setFormPriceCents('');
      setFormCostCents('');
      await loadData(tab, 1);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al guardar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productColumns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'code', header: 'CÓDIGO', width: 120 },
    { key: 'name', header: 'NOMBRE', width: 220 },
    { key: 'category', header: 'CATEGORÍA', width: 140 },
    {
      key: 'priceCents',
      header: 'PRECIO',
      align: 'right',
      render: (row) => (
        <Text style={styles.money}>
          ${((Number(row.priceCents) || 0) / 100).toFixed(2)}
        </Text>
      ),
    },
    {
      key: 'costCents',
      header: 'COSTO',
      align: 'right',
      render: (row) => (
        <Text style={styles.money}>
          ${((Number(row.costCents) || 0) / 100).toFixed(2)}
        </Text>
      ),
    },
    { key: 'status', header: 'ESTADO', align: 'center', render: (row) => <Badge label={String(row.status ?? 'ACTIVE')} /> },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.tabs}>
          <Pressable onPress={() => { setTab('products'); setPage(1); }} style={[styles.tab, tab === 'products' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>Productos</Text>
          </Pressable>
          <Pressable onPress={() => { setTab('customers'); setPage(1); }} style={[styles.tab, tab === 'customers' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'customers' && styles.tabTextActive]}>Clientes</Text>
          </Pressable>
          <Pressable onPress={() => { setTab('suppliers'); setPage(1); }} style={[styles.tab, tab === 'suppliers' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'suppliers' && styles.tabTextActive]}>Proveedores</Text>
          </Pressable>
          <Pressable onPress={() => { setTab('warehouses'); setPage(1); }} style={[styles.tab, tab === 'warehouses' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'warehouses' && styles.tabTextActive]}>Almacenes</Text>
          </Pressable>
        </View>
        <Button label="+ Nuevo registro" onPress={() => setIsModalOpen(true)} size="sm" />
      </View>

      <DataTable
        columns={productColumns}
        data={data}
        isLoading={isLoading}
        onPageChange={(p) => setPage(p)}
        page={page}
        totalPages={totalPages}
      />

      <Modal onClose={() => setIsModalOpen(false)} title={`Nuevo ${tab === 'products' ? 'Producto' : 'Registro'}`} visible={isModalOpen}>
        <Input label="Código *" onChangeText={setFormCode} placeholder="EJ. PROD-001" value={formCode} />
        <Input label="Nombre *" onChangeText={setFormName} placeholder="Nombre completo" value={formName} />
        {tab === 'products' ? (
          <>
            <Input label="Categoría" onChangeText={setFormCategory} placeholder="Ej. Electrónica" value={formCategory} />
            <Input keyboardType="numeric" label="Precio ($)" onChangeText={setFormPriceCents} placeholder="0.00" value={formPriceCents} />
            <Input keyboardType="numeric" label="Costo ($)" onChangeText={setFormCostCents} placeholder="0.00" value={formCostCents} />
          </>
        ) : null}
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Guardar" onPress={() => void handleCreateProduct()} />
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
  money: { color: colors.ink, ...typography.mono, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
});
