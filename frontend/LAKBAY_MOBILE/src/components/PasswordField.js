import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

// A labelled password input with a show/hide toggle. The typed text is the
// only thing ever shown; a saved password can never be displayed.
export default function PasswordField({ label, value, onChangeText, error, placeholder = '••••••••', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.wrap, !!error && styles.wrapError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          {...inputProps}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
          accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
        >
          <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', marginBottom: 14 },
  label: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textSub, letterSpacing: 1, marginBottom: 6 },
  wrap: {
    flexDirection: 'row', alignItems: 'center', height: 48, paddingLeft: 14,
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  wrapError: { borderColor: '#DC2626' },
  input: { flex: 1, fontFamily: FONTS.medium, fontSize: 15, color: COLORS.navy, paddingVertical: 0 },
  eye: { width: 44, height: 46, justifyContent: 'center', alignItems: 'center' },
  error: { fontFamily: FONTS.medium, fontSize: 12, color: '#B91C1C', marginTop: 5, lineHeight: 16 },
});
