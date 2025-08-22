// A simple design system for the new UI
// Central tokens: colors, spacing, radii, shadows, and typography

export const Theme = {
  colors: {
    // Brand
    brand: '#7C3AED', // vivid violet
    brandAlt: '#22D3EE', // cyan accent

    // Semantic
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',

    // Text
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textInverse: '#FFFFFF',

    // Surfaces
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    surfaceElevated: '#FFFFFF',

    // Backgrounds
    background: '#F8FAFC',
    backdrop: 'rgba(15, 23, 42, 0.7)',

    // Lines
    line: '#E2E8F0',
    lineMuted: '#F1F5F9',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radii: {
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
    },
  },
  typography: {
    fonts: {
      regular: 'Inter_400Regular',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
      extrabold: 'Inter_800ExtraBold',
    },
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 22,
      display: 34,
    },
  },
} as const;
