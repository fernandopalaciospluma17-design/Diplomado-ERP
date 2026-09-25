export const colors = {
  signature: '#E08934',
  ink: '#18201F',
  slate: '#35413F',
  moss: '#547064',
  mist: '#F4F5F1',
  paper: '#FFFFFF',
  line: '#E2E7E1',
  muted: '#71807A',
  danger: '#B44736',
  success: '#2E7D5B',
  shadow: 'rgba(24, 32, 31, 0.08)',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const },
  mono: { fontSize: 12, lineHeight: 18, fontWeight: '600' as const },
};
