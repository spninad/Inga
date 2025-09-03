import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedCardProps = {
  children: React.ReactNode;
  variant?: 'default' | 'secondary';
  padding?: number;
  margin?: number;
  style?: ViewStyle;
  lightColor?: string;
  darkColor?: string;
};

export function ThemedCard({
  children,
  variant = 'default',
  padding = 12,
  margin = 0,
  style,
  lightColor,
  darkColor,
}: ThemedCardProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    variant === 'secondary' ? 'cardSecondary' : 'card'
  );

  const borderColor = useThemeColor({}, 'borderLight');

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: 8,
          padding,
          margin,
          borderWidth: 1,
          borderColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}