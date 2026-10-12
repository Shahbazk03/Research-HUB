import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type ContactMethod = 'WHATSAPP' | 'EMAIL' | 'PHONE';

interface ContactMethodPickerProps {
  value: ContactMethod;
  onChange: (method: ContactMethod) => void;
}

const OPTIONS: { method: ContactMethod; label: string; icon: string }[] = [
  { method: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
  { method: 'EMAIL', label: 'Email', icon: '📧' },
  { method: 'PHONE', label: 'Phone', icon: '📞' },
];

export const ContactMethodPicker = ({ value, onChange }: ContactMethodPickerProps) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Preferred Contact Method *</Text>
      <View style={styles.row}>
        {OPTIONS.map(opt => {
          const active = value === opt.method;
          return (
            <TouchableOpacity
              key={opt.method}
              style={[
                styles.option,
                active && {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                }
              ]}
              onPress={() => onChange(opt.method)}
            >
              <Text style={styles.icon}>{opt.icon}</Text>
              <Text style={[styles.optionLabel, active && { color: '#FFFFFF', fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1B4B',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  icon: {
    fontSize: 22,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
});
