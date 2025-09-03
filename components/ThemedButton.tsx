import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  lightColor?: string;
  darkColor?: string;
};

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  lightColor,
  darkColor,
}: ThemedButtonProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 
    variant === 'primary' ? 'primary' : 
    variant === 'secondary' ? 'secondary' :
    variant === 'danger' ? 'danger' :
    variant === 'success' ? 'accent' : 'primary'
  );
  
  const textColor = variant === 'secondary' ? 
    useThemeColor({}, 'secondaryText') : 
    useThemeColor({}, 'primaryText');

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
      medium: { paddingVertical: 12, paddingHorizontal: 16, minHeight: 44 },
      large: { paddingVertical: 16, paddingHorizontal: 20, minHeight: 52 },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      opacity: (disabled || loading) ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      color: textColor,
      fontWeight: '600',
    };

    const sizeStyles: Record<string, TextStyle> = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={textColor} 
          size={size === 'small' ? 'small' : 'small'} 
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}