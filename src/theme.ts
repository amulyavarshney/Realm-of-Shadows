export const theme = {
  colors: {
    surface: '#0D0D11',
    surface2: '#1A1A22',
    surface3: '#262631',
    onSurface: '#F0EAD6',
    onSurface2: '#D4CFC0',
    onSurface3: '#B8B3A6',
    gold: '#D4AF37',
    goldDim: '#AA8C2C',
    goldDark: '#4A3E15',
    parchment: '#F0EAD6',
    success: '#106A43',
    successGlow: '#1DB271',
    error: '#8B0000',
    errorGlow: '#C42121',
    warning: '#C5832B',
    border: '#333340',
    borderStrong: '#D4AF37',
    divider: '#22222D',
    good: '#106A43',
    evil: '#8B0000',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 4, md: 8, lg: 16, pill: 999 },
  font: {
    display: 'serif' as const, // display serif fallback (medieval feel)
    body: 'System' as const,
  },
};

export type Theme = typeof theme;
