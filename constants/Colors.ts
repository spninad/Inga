/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    // Base colors
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    
    // Semantic colors for UI elements
    primary: '#636ae8',
    primaryText: '#fff',
    secondary: '#f9f9f9',
    secondaryText: '#333',
    accent: '#28a745',
    danger: '#ff6b6b',
    warning: '#ffc107',
    
    // Text colors
    textSecondary: '#666',
    textTertiary: '#999',
    textPlaceholder: '#8E8E93',
    
    // Background variations
    backgroundSecondary: '#f8f9fa',
    backgroundTertiary: '#f2f2f7',
    
    // Border and separator colors
    border: '#ddd',
    borderLight: '#f0f0f0',
    separator: '#e9ecef',
    
    // Card and surface colors
    card: '#fff',
    cardSecondary: '#f9f9f9',
    
    // Header colors
    headerBackground: '#fff',
    headerText: '#333',
    headerTint: '#333',
    
    // Input colors
    inputBackground: '#fff',
    inputBorder: '#ddd',
    inputText: '#000',
    
    // Status colors
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8',
  },
  dark: {
    // Base colors
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    
    // Semantic colors for UI elements
    primary: '#636ae8',
    primaryText: '#fff',
    secondary: '#2C2C2E',
    secondaryText: '#ECEDEE',
    accent: '#32D74B',
    danger: '#FF453A',
    warning: '#FFD60A',
    
    // Text colors
    textSecondary: '#8E8E93',
    textTertiary: '#6D6D70',
    textPlaceholder: '#6D6D70',
    
    // Background variations
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',
    
    // Border and separator colors
    border: '#38383A',
    borderLight: '#2C2C2E',
    separator: '#38383A',
    
    // Card and surface colors
    card: '#1C1C1E',
    cardSecondary: '#2C2C2E',
    
    // Header colors
    headerBackground: '#1C1C1E',
    headerText: '#ECEDEE',
    headerTint: '#ECEDEE',
    
    // Input colors
    inputBackground: '#2C2C2E',
    inputBorder: '#38383A',
    inputText: '#ECEDEE',
    
    // Status colors
    success: '#32D74B',
    error: '#FF453A',
    info: '#64D2FF',
  },
};
