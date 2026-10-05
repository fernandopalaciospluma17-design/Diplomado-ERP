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

export function MasterDataScreen({ token, onError, permissions }: { token: string; onError: (msg: string) => void; permissions: string[] }) {
  const [tab, setTab] = useState<Tab>('products');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [unitOptions, setUnitOptions] = useState<Array<{ id: string; code: string; name: string }>>([]);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formPriceCents, setFormPriceCents] = useState('');
  const [formCostCents, setFormCostCents] = useState('');
  const canCreateProduct = permissions.includes('master-data.products.create');

  const readNestedValue = (row: Record<string, unknown>, key: string) => {
    const attributes = row.attributes as Record<string, unknown> | undefined;
    return attributes && Object.prototype.hasOwnProperty.call(attributes, key) ? attributes[key] : row[key];
  };

  const loadReferenceOptions = async () => {
    const [categoriesResponse, unitsResponse] = await Promise.all([
      apiRequest<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>('/api/v1/master-data/categories?page=1&limit=100', {}, token),
      apiRequest<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>('/api/v1/master-data/units?page=1&limit=100', {}, token)
    ]);

    const normalizeOptions = (response: PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]) => {
      const items = Array.isArray(response) ? response : response.items ?? [];
      return items.map((item) => ({
        id: String((item.id ?? item._id ?? '')),
        code: String(item.code ?? ''),
        name: String(item.name ?? item.code ?? 'Sin nombre')
      })).filter((item) => item.id);
    };

    const categoryItems = normalizeOptions(categoriesResponse);
    const unitItems = normalizeOptions(unitsResponse);
    setCategoryOptions(categoryItems);
    setUnitOptions(unitItems);
    if (!formCategoryId && categoryItems[0]) setFormCategoryId(categoryItems[0].id);
    if (!formUnitId && unitItems[0]) setFormUnitId(unitItems[0].id);
  };

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

      if (activeTab === 'products') {
        await loadReferenceOptions();
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
    if (!formCategoryId.trim() || !formUnitId.trim()) {
      onError('Selecciona una categoría y una unidad válidas.');
      return;
    }
    setIsSubmitting(true);
    try {
      const parseMoney = (value: string) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return 0;
        return Math.round(parsed * 100);
      };

      await apiRequest(
        '/api/v1/master-data/products',
        {
          method: 'POST',
          body: JSON.stringify({
            code: formCode.trim().toUpperCase(),
            name: formName.trim(),
            status: 'ACTIVE',
            attributes: {
              categoryId: formCategoryId.trim(),
              unitId: formUnitId.trim(),
              priceCents: parseMoney(formPriceCents),
              costCents: parseMoney(formCostCents),
              trackInventory: true,
              trackLots: false,
              trackSerials: false,
              minStock: 0,
              reorderPoint: 0,
            },
          }),
        },
        token
      );
      setIsModalOpen(false);
      setFormCode('');
      setFormName('');
      setFormCategoryId(categoryOptions[0]?.id ?? '');
      setFormUnitId(unitOptions[0]?.id ?? '');
      setFormPriceCents('');
      setFormCostCents('');
      await loadData(tab, 1);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al guardar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryMap = new Map(categoryOptions.map((category) => [category.id, category.name]));
  const unitMap = new Map(unitOptions.map((unit) => [unit.id, unit.name]));
  const productColumns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'code', header: 'CÓDIGO', width: 120 },
    { key: 'name', header: 'NOMBRE', width: 220 },
    {
      key: 'categoryId',
      header: 'CATEGORÍA',
      width: 140,
      render: (row) => <Text>{categoryMap.get(String(readNestedValue(row, 'categoryId') ?? '')) ?? 'Sin categoría'}</Text>,
    },
    {
      key: 'priceCents',
      header: 'PRECIO',
      align: 'right',
      render: (row) => (
        <Text style={styles.money}>
          ${((Number(readNestedValue(row, 'priceCents')) || 0) / 100).toFixed(2)}
        </Text>
      ),
    },
    {
      key: 'costCents',
      header: 'COSTO',
      align: 'right',
      render: (row) => (
        <Text style={styles.money}>
          ${((Number(readNestedValue(row, 'costCents')) || 0) / 100).toFixed(2)}
        </Text>
      ),
    },
    {
      key: 'unitId',
      header: 'UNIDAD',
      width: 120,
      render: (row) => <Text>{unitMap.get(String(readNestedValue(row, 'unitId') ?? '')) ?? 'Sin unidad'}</Text>,
    },
    { key: 'status', header: 'ESTADO', align: 'center', render: (row) => <Badge label={String(row.status ?? 'ACTIVE')} /> },
  ];
  const columns: ColumnDef<Record<string, unknown>>[] = tab === 'products'
    ? productColumns
    : [
        { key: 'code', header: 'CÓDIGO', width: 140 },
        { key: 'name', header: 'NOMBRE', width: 220 },
        ...(tab === 'warehouses'
          ? [{ key: 'address', header: 'DIRECCIÓN', width: 240 }]
          : [
              { key: 'email', header: 'CORREO', width: 220 },
              { key: 'phone', header: 'TELÉFONO', width: 150 },
            ]),
        { key: 'status', header: 'ESTADO', align: 'center', render: (row) => <Badge label={String(row.status ?? 'ACTIVE')} /> },
      ];
  const availableTabs = ([
    { id: 'products', label: 'Productos' },
    { id: 'customers', label: 'Clientes' },
    { id: 'suppliers', label: 'Proveedores' },
    { id: 'warehouses', label: 'Almacenes' },
  ] as const).filter(({ id }) => permissions.includes(`master-data.${id}.read`));

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.tabs}>
          {availableTabs.map(({ id, label }) => (
            <Pressable key={id} onPress={() => { setTab(id); setPage(1); }} style={[styles.tab, tab === id && styles.tabActive]}>
              <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {tab === 'products' && canCreateProduct
          ? <Button label="+ Nuevo producto" onPress={() => setIsModalOpen(true)} size="sm" />
          : null}
      </View>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        onPageChange={(p) => setPage(p)}
        page={page}
        totalPages={totalPages}
      />

      <Modal onClose={() => setIsModalOpen(false)} title="Nuevo producto" visible={isModalOpen}>
        <Input label="Código *" onChangeText={setFormCode} placeholder="EJ. PROD-001" value={formCode} />
        <Input label="Nombre *" onChangeText={setFormName} placeholder="Nombre completo" value={formName} />
        {tab === 'products' ? (
          <>
            <Input label="ID de categoría *" onChangeText={setFormCategoryId} placeholder="507f1f77bcf86cd799439011" value={formCategoryId} />
            <Input label="ID de unidad *" onChangeText={setFormUnitId} placeholder="507f1f77bcf86cd799439012" value={formUnitId} />
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
