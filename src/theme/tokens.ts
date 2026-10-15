/**
 * Wastoo Design System Tokens
 * Friendly Eco-Tech identity
 */

export const colors = {
  canvas: {
    primary: '#FFFFFF',
    secondary: '#F6FAF7',
    tertiary: '#FFFFFF',
  },
  emerald: {
    50: '#E6F4EE',
    100: '#CDE9DF',
    200: '#9BD3BF',
    300: '#69BE9F',
    400: '#37A880',
    500: '#087F5B',
    600: '#077150',
    700: '#056244',
    800: '#045439',
    900: '#03462D',
  },
  mint: {
    50: '#ECFDF7',
    100: '#D8F9EE',
    200: '#B1F4DC',
    300: '#8BEFCB',
    400: '#64EABA',
    500: '#42D6B0',
    600: '#3BC49E',
    700: '#32A78B',
    800: '#2A8978',
    900: '#226B65',
  },
  forest: {
    50: '#E9EEEC',
    100: '#D2DCDA',
    200: '#A5B9B5',
    300: '#789590',
    400: '#4B726B',
    500: '#172B2A',
    600: '#142625',
    700: '#112020',
    800: '#0D1B1B',
    900: '#0A1616',
  },

  // Sunburst Gold (ONLY for money, rewards, earnings)
  gold: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFC107',          // Primary gold
    600: '#FFB300',
    700: '#FFA000',
    800: '#FF8F00',
    900: '#FF6F00',
  },

  // Semantic Colors
  success: '#27AE60',
  warning: '#F59E0B',
  error: '#E74C3C',
  info: '#3B82F6',

  // Status Badge Colors (background/text pairs)
  status: {
    pending: {
      bg: '#FFF8E1',
      text: '#F59E0B',
    },
    assigned: {
      bg: '#EFF6FF',
      text: '#3B82F6',
    },
    inTransit: {
      bg: '#F5F3FF',
      text: '#8B5CF6',
    },
    completed: {
      bg: '#E8F8EE',
      text: '#1E5631',
    },
    canceled: {
      bg: '#FEF2F2',
      text: '#EF4444',
    },
  },

  // Text Colors
  text: {
    primary: '#1b1c1c',      // Main text
    secondary: '#3d4a3f',    // Secondary text
    tertiary: '#6D7A6E',     // Muted text
    quaternary: '#8A8F87',   // Placeholder text
    disabled: '#B0B0B0',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    light: '#F0F0F0',
    default: '#ECECEC',
    medium: '#D0D0D0',
    dark: '#B0B0B0',
  },

  // Category Colors (waste types)
  category: {
    plastic: '#2ECC71',
    organic: '#27AE60',
    glass: '#3B82F6',
    metal: '#8A8F87',
    paper: '#F59E0B',
    general: '#6D7A6E',
  },

  // Overlays & Shadows
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadowDark: '#000000',
} as const;

// ============================================
// SPACING SCALE (4px base unit)
// ============================================

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
} as const;

// ============================================
// TYPOGRAPHY (Poppins)
// ============================================

export const typography = {
  // Font Family
  fontFamily: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },

  // Font Sizes (with line heights)
  fontSize: {
    xs: { size: 10, lineHeight: 14 },
    sm: { size: 12, lineHeight: 16 },
    base: { size: 14, lineHeight: 20 },
    md: { size: 15, lineHeight: 22 },
    lg: { size: 16, lineHeight: 24 },
    xl: { size: 18, lineHeight: 26 },
    '2xl': { size: 20, lineHeight: 28 },
    '3xl': { size: 24, lineHeight: 32 },
    '4xl': { size: 28, lineHeight: 36 },
    '5xl': { size: 32, lineHeight: 40 },
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  // Light shadows for cards, inputs
  sm: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Default shadow for elevated cards
  md: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Strong shadow for floating elements (FAB, modals)
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Extra strong for bottom sheets, important CTAs
  xl: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ============================================
// COMPONENT SIZES
// ============================================

export const componentSizes = {
  button: {
    sm: { height: 40, paddingHorizontal: spacing.lg },
    md: { height: 48, paddingHorizontal: spacing.xl },
    lg: { height: 56, paddingHorizontal: spacing['2xl'] },
  },

  input: {
    sm: { height: 44, paddingHorizontal: spacing.lg },
    md: { height: 52, paddingHorizontal: spacing.lg },
    lg: { height: 56, paddingHorizontal: spacing.lg },
  },

  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
    '2xl': 64,
  },
} as const;

// ============================================
// GRADIENTS
// ============================================

export const gradients = {
  // Primary eco-green gradient
  emeraldPrimary: {
    colors: [colors.emerald[500], colors.emerald[600]],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },

  // Mint accent gradient
  mintAccent: {
    colors: [colors.mint[400], colors.mint[500]],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },

  // Gold gradient for rewards/earnings
  goldReward: {
    colors: [colors.gold[500], colors.gold[600]],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },

  // Disabled state gradient
  disabled: {
    colors: ['#9CA3AF', '#9CA3AF'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
} as const;

// ============================================
// ANIMATION TIMINGS
// ============================================

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },

  easing: {
    easeOut: 'ease-out' as const,
    easeIn: 'ease-in' as const,
    easeInOut: 'ease-in-out' as const,
    spring: 'spring' as const,
  },
} as const;

// ============================================
// Z-INDEX LAYERS
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;

// ============================================
// EXPORT DEFAULT THEME
// ============================================

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  componentSizes,
  gradients,
  animation,
  zIndex,
} as const;

export type Theme = typeof theme;
export default theme;
