import React from 'react';
import { TextInput, TextInputProps, ViewStyle } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextInputProps = TextInputProps & {
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  lightTextColor?: string;
  darkTextColor?: string;
  lightBorderColor?: string;
  darkBorderColor?: string;
  containerStyle?: ViewStyle;
};

export function ThemedTextInput({
  style,
  lightBackgroundColor,
  darkBackgroundColor,
  lightTextColor,
  darkTextColor,
  lightBorderColor,
  darkBorderColor,
  containerStyle,
  placeholderTextColor,
  ...otherProps
}: ThemedTextInputProps) {
  const backgroundColor = useThemeColor(
    { light: lightBackgroundColor, dark: darkBackgroundColor },
    'inputBackground'
  );
  
  const textColor = useThemeColor(
    { light: lightTextColor, dark: darkTextColor },
    'inputText'
  );
  
  const borderColor = useThemeColor(
    { light: lightBorderColor, dark: darkBorderColor },
    'inputBorder'
  );

  const defaultPlaceholderColor = useThemeColor({}, 'textPlaceholder');

  return (
    <TextInput
      style={[
        {
          backgroundColor,
          color: textColor,
          borderColor,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          minHeight: 44,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor || defaultPlaceholderColor}
      {...otherProps}
    />
  );
}