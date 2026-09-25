import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

export function CrmScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [leads, setLeads] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [valueCents, setValueCents] = useState('5000');

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<Record<string, unknown>[] | { items: Record<string, unknown>[] }>('/api/v1/crm/leads', {}, token);
      setLeads(Array.isArray(res) ? res : res.items ?? []);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar prospectos');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  const handleCreateLead = async () => {
    if (!name.trim()) {
      onError('El nombre del prospecto es obligatorio.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(
        '/api/v1/crm/leads',
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            company: company.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            estimatedValueCents: valueCents ? Math.round(parseFloat(valueCents) * 100) : 0,
            status: 'NEW',
          }),
        },
        token
      );
      setIsModalOpen(false);
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      await loadLeads();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al registrar prospecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'leadNumber', header: 'FOLIO', width: 110 },
    { key: 'name', header: 'PROSPECTO / CONTACTO', width: 200 },
    { key: 'company', header: 'EMPRESA', width: 160 },
    { key: 'status', header: 'ETAPA', align: 'center', render: (r) => <Badge label={String(r.status ?? 'NEW')} /> },
    {
      key: 'estimatedValueCents',
      header: 'VALOR EST. ($)',
      align: 'right',
      render: (r) => <Text style={styles.money}>${((Number(r.estimatedValueCents) || 0) / 100).toFixed(2)}</Text>,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>CRM y Embudos de Venta</Text>
        <Button label="+ Nuevo Prospecto" onPress={() => setIsModalOpen(true)} size="sm" />
      </View>

      <DataTable columns={columns} data={leads} isLoading={isLoading} />

      <Modal onClose={() => setIsModalOpen(false)} title="Nuevo Prospecto de CRM" visible={isModalOpen}>
        <Input label="Nombre del contacto *" onChangeText={setName} placeholder="Ej. Juan Pérez" value={name} />
        <Input label="Empresa" onChangeText={setCompany} placeholder="Ej. Corporativo ABC" value={company} />
        <Input label="Correo electrónico" onChangeText={setEmail} placeholder="juan@abc.com" value={email} />
        <Input label="Teléfono" onChangeText={setPhone} placeholder="555-123-4567" value={phone} />
        <Input keyboardType="numeric" label="Valor Estimado ($)" onChangeText={setValueCents} placeholder="5000.00" value={valueCents} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Guardar prospecto" onPress={() => void handleCreateLead()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, ...typography.title, fontSize: 16 },
  money: { color: colors.ink, ...typography.mono, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
});
