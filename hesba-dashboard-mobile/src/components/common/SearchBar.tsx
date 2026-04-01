/**
 * SearchBar — Debounced search input for list screens.
 *
 * Debounces input by 400ms before calling onSearch so we don't
 * fire API requests on every keystroke.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, Fonts } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  /** Debounce delay in ms. Default: 400 */
  debounce?: number;
  initialValue?: string;
}

export const SearchBar = React.memo(function SearchBar({
  placeholder,
  onSearch,
  debounce = 400,
  initialValue = '',
}: SearchBarProps) {
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = isDark ? Colors.dark : Colors.light;
  const fontFamily = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(text), debounce);
    },
    [onSearch, debounce],
  );

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={palette.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            color: palette.text,
            fontFamily,
            fontSize: FontSize.base,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color={palette.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    height: 44,
    gap: Spacing[2],
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  clearBtn: {
    flexShrink: 0,
    padding: Spacing[1],
  },
});
