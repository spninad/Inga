# Dark Mode Implementation Guide

## Overview

The Inga app now supports comprehensive dark mode functionality that automatically adapts to the user's system preferences.

## Key Features

### ✅ Implemented
- **System-aware theming**: Automatically detects and responds to system dark/light mode changes
- **Comprehensive color system**: Extended Colors.ts with semantic color definitions
- **Themed components**: Created ThemedButton, ThemedCard, and ThemedTextInput for consistent styling
- **Navigation theming**: Headers, tab bars, and navigation elements adapt to theme
- **All main screens updated**: Documents, Forms, Chats, and Auth screens support dark mode
- **Icon color adaptation**: All icons properly adapt their colors to the current theme
- **Layout fixes**: Fixed list clipping issues with proper FlatList contentContainerStyle usage

### 🎨 Color System

The app uses a semantic color system defined in `constants/Colors.ts`:

#### Base Colors
- `text` / `background` - Primary text and background
- `tint` / `icon` - Accent colors and icons
- `primary` / `secondary` - Main brand colors and surfaces

#### Semantic Colors
- `textSecondary` / `textTertiary` - Secondary text levels
- `success` / `error` / `warning` / `info` - Status colors
- `card` / `cardSecondary` - Surface colors
- `border` / `separator` - Divider colors
- `input*` - Form input colors
- `header*` - Navigation colors

### 🧩 Themed Components

#### ThemedView
```tsx
import { ThemedView } from '@/components/ThemedView';

<ThemedView style={styles.container}>
  {/* Content automatically gets proper background color */}
</ThemedView>
```

#### ThemedText
```tsx
import { ThemedText } from '@/components/ThemedText';

<ThemedText style={styles.title}>
  Text that adapts to light/dark themes
</ThemedText>
```

#### ThemedButton
```tsx
import { ThemedButton } from '@/components/ThemedButton';

<ThemedButton
  title="Save"
  onPress={handleSave}
  variant="primary" // primary | secondary | danger | success
  size="medium"    // small | medium | large
/>
```

#### ThemedCard
```tsx
import { ThemedCard } from '@/components/ThemedCard';

<ThemedCard style={styles.item}>
  <ThemedText>Card content with themed background</ThemedText>
</ThemedCard>
```

#### ThemedTextInput
```tsx
import { ThemedTextInput } from '@/components/ThemedTextInput';

<ThemedTextInput
  placeholder="Enter text..."
  value={text}
  onChangeText={setText}
/>
```

### 🎯 Usage in Components

```tsx
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function MyComponent() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <ThemedView style={styles.container}>
      <Ionicons 
        name="heart" 
        size={24} 
        color={colors.primary} // Adapts to theme
      />
    </ThemedView>
  );
}
```

## Testing Dark Mode

### Device Testing
1. **iOS**: Settings → Display & Brightness → Dark Mode
2. **Android**: Settings → Display → Dark Theme
3. **Expo Development**: Shake device → Toggle Appearance

### Simulator Testing
- **iOS Simulator**: Device → Appearance → Dark/Light
- **Android Emulator**: Settings → Display → Dark Theme

### Manual Testing Checklist
- [ ] All text is readable in both themes
- [ ] Icons have appropriate contrast
- [ ] Navigation headers adapt properly
- [ ] Tab bars switch colors correctly
- [ ] Cards and surfaces are distinguishable
- [ ] Input fields are clearly visible
- [ ] Buttons have proper contrast
- [ ] Lists don't get clipped at bottom
- [ ] Status indicators (success/error) are visible

## Layout Fixes

### List Clipping Resolution
Fixed FlatList clipping issues by:
- Using `style` prop for flex layout
- Using `contentContainerStyle` for padding/margins
- Ensuring proper bottom padding for scrollable content

### Before (Clipped)
```tsx
<FlatList
  style={styles.container} // ❌ Mixed layout and content styles
  contentContainerStyle={styles.withPadding}
/>
```

### After (Fixed)
```tsx
<FlatList
  style={styles.listContainer}        // ✅ Layout only
  contentContainerStyle={styles.listContent} // ✅ Content styling
/>
```

## Architecture

### File Structure
```
constants/
  Colors.ts                 # Extended color definitions
components/
  ThemedView.tsx           # Base themed container
  ThemedText.tsx           # Base themed text
  ThemedButton.tsx         # Themed button component
  ThemedCard.tsx           # Themed card component  
  ThemedTextInput.tsx      # Themed input component
app/
  _layout.tsx              # Theme-aware navigation
  index.tsx                # Theme-aware tab bar
  documents.tsx            # Dark mode support
  forms-list.tsx           # Dark mode support
  chats.tsx                # Dark mode support
  forms/index.tsx          # Dark mode support
utils/
  darkModeTest.ts          # Testing utilities
```

### Migration Pattern
For existing components:

1. **Add theme imports**:
```tsx
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView, ThemedText } from '@/components/...';
```

2. **Get theme colors**:
```tsx
const colorScheme = useColorScheme();
const colors = Colors[colorScheme ?? 'light'];
```

3. **Replace hardcoded colors**:
```tsx
// Before
<View style={{ backgroundColor: '#fff' }}>
  <Text style={{ color: '#333' }}>Hello</Text>
</View>

// After  
<ThemedView>
  <ThemedText>Hello</ThemedText>
</ThemedView>
```

4. **Update icon colors**:
```tsx
// Before
<Ionicons name="home" color="#636ae8" />

// After
<Ionicons name="home" color={colors.primary} />
```

## Benefits

- **User Experience**: Respects user's system preferences
- **Accessibility**: Better readability in different lighting conditions  
- **Battery Life**: OLED displays save power in dark mode
- **Consistency**: Unified theming across the entire app
- **Maintainability**: Centralized color management
- **Future-proof**: Easy to add new color variants or themes

## Troubleshooting

### Common Issues

**Colors not updating**: Ensure you're using `Colors[colorScheme ?? 'light']` not just `Colors.light`

**Component not themed**: Check if you're using ThemedView/ThemedText instead of regular View/Text

**Icons wrong color**: Make sure icon color uses `colors.primary` not hardcoded hex values

**List clipping**: Verify FlatList is using proper `style` and `contentContainerStyle` separation