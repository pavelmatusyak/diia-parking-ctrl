import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

const palette = {
  primary: '#000000', // Deep black for primary actions
  secondary: '#F2F2F7', // Light gray for backgrounds
  accent: '#007AFF', // iOS Blue for interactive elements
  success: '#34C759',
  warning: '#FFCC00',
  error: '#FF3B30',
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F2F2F7',
  gray200: '#E5E5EA',
  gray300: '#D1D1D6',
  gray400: '#C7C7CC',
  gray500: '#AEAEB2',
  gray600: '#8E8E93',
  gray700: '#636366',
  gray800: '#48484A',
  gray900: '#3A3A3C',
};

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#8E8E93',
    background: '#F2F2F7',
    card: '#FFFFFF',
    tint: palette.primary,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: palette.primary,
    border: '#C7C7CC',
    primary: palette.primary,
    error: palette.error,
    success: palette.success,
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    background: '#000000',
    card: '#1C1C1E',
    tint: palette.white,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: palette.white,
    border: '#3A3A3C',
    primary: palette.white,
    error: palette.error,
    success: palette.success,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
