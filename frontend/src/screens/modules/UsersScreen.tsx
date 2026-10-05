import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ApiError, apiRequest } from '../../lib/api';

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  roleId?: string;
  status: 'PENDING_CONFIRMATION' | 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
  createdAt: string;
};

type ManagedRole = {
  id?: string;
  _id?: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type UsersScreenProps = {
  token: string;
  companyName?: string;
  branchName?: string;
  permissions: string[];
};

function roleId(role: ManagedRole) {
  return role.id ?? role._id ?? '';
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 401) return 'La sesión expiró. Inicia sesión nuevamente.';
  if (error.status === 403) return 'Tu rol no tiene permiso para realizar esta acción.';
  if (error.status === 409) return error.message || 'El correo ya está registrado.';
  if (error.status === 422) return 'Revisa el nombre, correo y rol seleccionado.';
  if (error.status >= 500) return 'El servicio no pudo completar la operación. Inténtalo más tarde.';
  return error.message || fallback;
}

export function UsersScreen({ token, companyName, branchName, permissions }: UsersScreenProps) {
  const canCreate = permissions.includes('platform.users.create')
    && permissions.includes('platform.roles.read');
  const canResend = permissions.includes('platform.users.create');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingResend, setPendingResend] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const roleNames = useMemo(() => new Map(roles.map((role) => [roleId(role), role.name])), [roles]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await apiRequest<ManagedUser[]>('/api/v1/auth/users', {}, token);
      setUsers(userData);
      if (permissions.includes('platform.roles.read')) {
        const roleData = await apiRequest<ManagedRole[]>('/api/v1/core/roles', {}, token);
        const activeRoles = roleData.filter((role) => role.status === 'ACTIVE' && roleId(role));
        setRoles(activeRoles);
        const firstRoleId = activeRoles[0] ? roleId(activeRoles[0]) : '';
        setSelectedRoleId((current) => activeRoles.some((role) => roleId(role) === current) ? current : firstRoleId);
      }
    } catch (loadError) {
      setError(errorMessage(loadError, 'No se pudieron cargar los usuarios.'));
    } finally {
      setIsLoading(false);
    }
  }, [permissions, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const closeModal = () => {
    setIsModalOpen(false);
    setName('');
    setEmail('');
    setError(null);
  };

  const createUser = async () => {
    if (!name.trim() || !email.trim() || !selectedRoleId) {
      setError('Completa el nombre, correo y selecciona un rol.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest('/api/v1/auth/users', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), roleId: selectedRoleId }),
      }, token);
      closeModal();
      setNotice('Invitación enviada. La cuenta quedará pendiente hasta que la persona confirme su correo.');
      await loadData();
    } catch (createError) {
      setError(errorMessage(createError, 'No se pudo crear el usuario.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendInvitation = async (user: ManagedUser) => {
    setPendingResend(user.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/v1/auth/users/${encodeURIComponent(user.id)}/resend-invitation`, {
        method: 'POST',
      }, token);
      setNotice(`Se reenvió la invitación a ${user.email}.`);
    } catch (resendError) {
      setError(errorMessage(resendError, 'No se pudo reenviar la invitación.'));
    } finally {
      setPendingResend(null);
    }
  };

  const columns: ColumnDef<ManagedUser>[] = [
    { key: 'name', header: 'NOMBRE', width: 180 },
    { key: 'email', header: 'CORREO', width: 230 },
    { key: 'roleId', header: 'ROL', width: 150, render: (user) => <Text style={styles.cellText}>{roleNames.get(user.roleId ?? '') ?? 'Sin rol disponible'}</Text> },
    { key: 'status', header: 'ESTADO', width: 180, render: (user) => <Badge label={user.status} /> },
    {
      key: 'invitation',
      header: 'INVITACIÓN',
      width: 150,
      render: (user) => user.status === 'PENDING_CONFIRMATION' && canResend
        ? <Pressable accessibilityRole="button" disabled={pendingResend === user.id} onPress={() => void resendInvitation(user)}><Text style={styles.actionText}>{pendingResend === user.id ? 'Enviando...' : 'Reenviar'}</Text></Pressable>
        : <Text style={styles.cellText}>—</Text>,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Usuarios de la empresa</Text>
          <Text style={styles.subtitle}>{companyName ?? 'Empresa'} · {branchName ?? 'Sucursal activa'}</Text>
        </View>
        <View style={styles.headerActions}>
          <Button label="Actualizar" onPress={() => void loadData()} size="sm" variant="outline" />
          {canCreate ? <Button label="+ Invitar usuario" onPress={() => { setNotice(null); setError(null); setIsModalOpen(true); }} size="sm" /> : null}
        </View>
      </View>

      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}

      <DataTable
        columns={columns}
        data={users}
        emptyMessage="Todavía no hay usuarios en esta empresa."
        isLoading={isLoading}
      />

      <Modal onClose={closeModal} title="Invitar usuario" visible={isModalOpen}>
        <Text style={styles.formHelp}>Se enviará un enlace de confirmación. La cuenta estará pendiente hasta que la persona establezca su contraseña.</Text>
        <Input autoCapitalize="words" label="Nombre completo *" onChangeText={setName} placeholder="Nombre y apellido" value={name} />
        <Input autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="Correo electrónico *" onChangeText={setEmail} placeholder="persona@empresa.com" value={email} />
        <Text style={styles.roleLabel}>Rol *</Text>
        {roles.length ? (
          <ScrollView contentContainerStyle={styles.roleList} style={styles.roleScroll}>
            {roles.map((role) => {
              const id = roleId(role);
              const selected = selectedRoleId === id;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={id}
                  onPress={() => setSelectedRoleId(id)}
                  style={[styles.roleOption, selected && styles.roleOptionSelected]}
                >
                  <Text style={[styles.roleName, selected && styles.roleNameSelected]}>{role.name}</Text>
                  <Text style={[styles.roleCode, selected && styles.roleCodeSelected]}>{role.code}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.formHelp}>No hay roles activos disponibles para asignar. Verifica tus permisos o configura un rol activo.</Text>
        )}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <View style={styles.modalActions}>
          <Button label="Cancelar" onPress={closeModal} variant="outline" />
          <Button isLoading={isSubmitting} label="Enviar invitación" onPress={() => void createUser()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  headerCopy: { flex: 1, marginRight: spacing.md },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  title: { color: colors.ink, ...typography.display, fontSize: 22 },
  subtitle: { color: colors.muted, ...typography.body, fontSize: 13, marginTop: 4 },
  cellText: { color: colors.slate, fontSize: 12 },
  actionText: { color: colors.moss, fontSize: 12, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, fontWeight: '600', marginBottom: spacing.md },
  notice: { color: colors.moss, fontSize: 13, fontWeight: '600', marginBottom: spacing.md },
  formHelp: { color: colors.muted, ...typography.body, fontSize: 12, marginBottom: spacing.md },
  roleLabel: { color: colors.slate, ...typography.label, marginBottom: spacing.sm },
  roleScroll: { maxHeight: 180 },
  roleList: { gap: spacing.sm, paddingBottom: spacing.sm },
  roleOption: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, padding: spacing.md },
  roleOptionSelected: { backgroundColor: colors.mist, borderColor: colors.moss },
  roleName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  roleNameSelected: { color: colors.moss },
  roleCode: { color: colors.muted, fontSize: 11, marginTop: 3 },
  roleCodeSelected: { color: colors.moss },
  modalActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.md },
});
