import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

type Tab = 'employees' | 'attendance';

export function HrScreen({ token, onError }: { token: string; onError: (msg: string) => void }) {
  const [tab, setTab] = useState<Tab>('employees');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Modal Employee
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empNumber, setEmpNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');

  const loadData = async (activeTab = tab) => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'attendance' ? '/api/v1/hr/attendance' : '/api/v1/hr/employees';
      const res = await apiRequest<Record<string, unknown>[] | { items: Record<string, unknown>[] }>(endpoint, {}, token);
      setData(Array.isArray(res) ? res : res.items ?? []);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al cargar RRHH');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData(tab);
  }, [tab]);

  const handleCreateEmployee = async () => {
    if (!empNumber.trim() || !firstName.trim() || !lastName.trim()) {
      onError('Número de empleado, nombre y apellido son requeridos.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(
        '/api/v1/hr/employees',
        {
          method: 'POST',
          body: JSON.stringify({
            employeeNumber: empNumber.trim().toUpperCase(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            department: department.trim() || undefined,
            position: position.trim() || undefined,
            status: 'ACTIVE',
          }),
        },
        token
      );
      setIsEmpModalOpen(false);
      setEmpNumber('');
      setFirstName('');
      setLastName('');
      setDepartment('');
      setPosition('');
      await loadData(tab);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error al dar de alta empleado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const empColumns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'employeeNumber', header: 'NO. EMPLEADO', width: 120 },
    {
      key: 'name',
      header: 'NOMBRE COMPLETO',
      width: 220,
      render: (r) => <Text style={styles.nameText}>{`${String(r.firstName ?? '')} ${String(r.lastName ?? '')}`}</Text>,
    },
    { key: 'department', header: 'DEPARTAMENTO', width: 140 },
    { key: 'position', header: 'PUESTO', width: 140 },
    { key: 'status', header: 'ESTADO', align: 'center', render: (r) => <Badge label={String(r.status ?? 'ACTIVE')} /> },
  ];

  const attColumns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'employeeNumber', header: 'NO. EMPLEADO', width: 120 },
    { key: 'date', header: 'FECHA', width: 120 },
    { key: 'status', header: 'ASISTENCIA', align: 'center', render: (r) => <Badge label={String(r.status ?? 'PRESENT')} /> },
    { key: 'checkIn', header: 'ENTRADA', width: 100 },
    { key: 'checkOut', header: 'SALIDA', width: 100 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('employees')} style={[styles.tab, tab === 'employees' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'employees' && styles.tabTextActive]}>Colaboradores</Text>
          </Pressable>
          <Pressable onPress={() => setTab('attendance')} style={[styles.tab, tab === 'attendance' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'attendance' && styles.tabTextActive]}>Asistencia y Checador</Text>
          </Pressable>
        </View>
        <Button label="+ Nuevo Colaborador" onPress={() => setIsEmpModalOpen(true)} size="sm" />
      </View>

      <DataTable columns={tab === 'employees' ? empColumns : attColumns} data={data} isLoading={isLoading} />

      <Modal onClose={() => setIsEmpModalOpen(false)} title="Dar de Alta Colaborador" visible={isEmpModalOpen}>
        <Input label="Número de Empleado *" onChangeText={setEmpNumber} placeholder="EMP-001" value={empNumber} />
        <Input label="Nombre(s) *" onChangeText={setFirstName} placeholder="María" value={firstName} />
        <Input label="Apellido(s) *" onChangeText={setLastName} placeholder="González" value={lastName} />
        <Input label="Departamento" onChangeText={setDepartment} placeholder="Operaciones" value={department} />
        <Input label="Puesto / Cargo" onChangeText={setPosition} placeholder="Analista" value={position} />
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={() => setIsEmpModalOpen(false)} variant="outline" />
          <Button isLoading={isSubmitting} label="Guardar colaborador" onPress={() => void handleCreateEmployee()} />
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
  nameText: { color: colors.ink, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
});
