import { ActivityIndicator, type DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { colors, radii, spacing, typography } from '../../design/tokens';

export type ColumnDef<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: DimensionValue;
};

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowPress?: (row: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No se encontraron registros',
  onRowPress,
  page,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.signature} size="large" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>∅</Text>
        </View>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  col.align === 'center' && styles.alignCenter,
                  col.align === 'right' && styles.alignRight,
                  col.width ? { width: col.width } : { flex: 1, minWidth: 120 },
                ]}
              >
                <Text style={styles.headerText}>{col.header}</Text>
              </View>
            ))}
          </View>
          {data.map((row, index) => (
            <Pressable
              key={(row.id as string) ?? (row.code as string) ?? index}
              onPress={() => onRowPress?.(row)}
              style={[styles.bodyRow, index % 2 === 1 && styles.stripeRow]}
            >
              {columns.map((col) => {
                const cellValue = row[col.key];
                return (
                  <View
                    key={col.key}
                    style={[
                      styles.bodyCell,
                      col.align === 'center' && styles.alignCenter,
                      col.align === 'right' && styles.alignRight,
                      col.width ? { width: col.width } : { flex: 1, minWidth: 120 },
                    ]}
                  >
                    {col.render ? (
                      col.render(row)
                    ) : col.key === 'status' ? (
                      <Badge label={String(cellValue ?? 'ACTIVO')} />
                    ) : (
                      <Text style={styles.cellText}>{String(cellValue ?? '-')}</Text>
                    )}
                  </View>
                );
              })}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {page !== undefined && totalPages !== undefined && onPageChange ? (
        <View style={styles.pagination}>
          <Text style={styles.pageInfo}>
            Página {page} de {Math.max(1, totalPages)}
          </Text>
          <View style={styles.pageActions}>
            <Pressable
              disabled={page <= 1}
              onPress={() => onPageChange(page - 1)}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <Text style={styles.pageBtnText}>Anterior</Text>
            </Pressable>
            <Pressable
              disabled={page >= totalPages}
              onPress={() => onPageChange(page + 1)}
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            >
              <Text style={styles.pageBtnText}>Siguiente</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  loadingText: { color: colors.muted, marginTop: spacing.md, fontSize: 13 },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyIconText: { color: colors.muted, fontSize: 20, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 14 },
  table: { minWidth: '100%' },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerCell: { paddingHorizontal: 6, justifyContent: 'center' },
  headerText: { color: colors.slate, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  stripeRow: { backgroundColor: '#FAFAFA' },
  bodyCell: { paddingHorizontal: 6, justifyContent: 'center' },
  cellText: { ...typography.body, color: colors.ink, fontSize: 13 },
  alignCenter: { alignItems: 'center' },
  alignRight: { alignItems: 'flex-end' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.mist,
  },
  pageInfo: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  pageActions: { flexDirection: 'row', gap: 8 },
  pageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: colors.slate, fontSize: 12, fontWeight: '700' },
});
