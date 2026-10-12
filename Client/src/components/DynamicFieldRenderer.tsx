import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, useTheme, Checkbox, Switch } from 'react-native-paper';
import { RequirementField } from '../api/services';

interface DynamicFieldRendererProps {
  field: RequirementField;
  value: any;
  onChange: (key: string, value: any) => void;
}

export const DynamicFieldRenderer = ({ field, value, onChange }: DynamicFieldRendererProps) => {
  const theme = useTheme();
  const inputOutlineStyle = { borderRadius: 12, borderColor: '#E2E8F0' };
  const inputStyle = { backgroundColor: '#F8FAFC', marginBottom: 4 };
  const isRequired = field.isRequired;

  // ── TEXT, EMAIL, PHONE ──────────────────────────────────────────────────────
  if (field.type === 'TEXT' || field.type === 'EMAIL' || field.type === 'PHONE') {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        <TextInput
          value={value || ''}
          onChangeText={(v) => onChange(field.key, v)}
          mode="outlined"
          placeholder={field.placeholder}
          keyboardType={field.type === 'EMAIL' ? 'email-address' : field.type === 'PHONE' ? 'phone-pad' : 'default'}
          autoCapitalize="none"
          style={inputStyle}
          outlineStyle={inputOutlineStyle}
        />
      </View>
    );
  }

  // ── LONG_TEXT ───────────────────────────────────────────────────────────────
  if (field.type === 'LONG_TEXT') {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        <TextInput
          value={value || ''}
          onChangeText={(v) => onChange(field.key, v)}
          mode="outlined"
          placeholder={field.placeholder}
          multiline
          numberOfLines={5}
          style={[inputStyle, { minHeight: 120 }]}
          outlineStyle={inputOutlineStyle}
        />
      </View>
    );
  }

  // ── NUMBER ──────────────────────────────────────────────────────────────────
  if (field.type === 'NUMBER') {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        <TextInput
          value={value !== undefined && value !== '' ? String(value) : ''}
          onChangeText={(v) => onChange(field.key, v ? Number(v) : '')}
          mode="outlined"
          placeholder={field.placeholder || '0'}
          keyboardType="numeric"
          style={inputStyle}
          outlineStyle={inputOutlineStyle}
        />
        {field.validation?.min !== undefined && (
          <Text style={styles.hint}>Min: {field.validation.min}{field.validation.max ? ` · Max: ${field.validation.max}` : ''}</Text>
        )}
      </View>
    );
  }

  // ── DATE ────────────────────────────────────────────────────────────────────
  if (field.type === 'DATE') {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        <TextInput
          value={value || ''}
          onChangeText={(v) => onChange(field.key, v)}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          style={inputStyle}
          outlineStyle={inputOutlineStyle}
          left={<TextInput.Icon icon="calendar-outline" />}
        />
      </View>
    );
  }

  // ── SELECT ──────────────────────────────────────────────────────────────────
  if (field.type === 'SELECT') {
    const opts = field.options || [];
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        <View style={styles.optionsContainer}>
          {opts.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.selectOption,
                value === opt.value && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }
              ]}
              onPress={() => onChange(field.key, opt.value)}
            >
              <View style={[
                styles.radioCircle,
                value === opt.value && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }
              ]} />
              <Text style={[styles.optionLabel, value === opt.value && { color: theme.colors.primary, fontWeight: '600' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── RADIO ───────────────────────────────────────────────────────────────────
  if (field.type === 'RADIO') {
    const opts = field.options || [];
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        {opts.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.selectOption,
              value === opt.value && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }
            ]}
            onPress={() => onChange(field.key, opt.value)}
          >
            <View style={[
              styles.radioCircle,
              value === opt.value && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }
            ]} />
            <Text style={[styles.optionLabel, value === opt.value && { color: theme.colors.primary, fontWeight: '600' }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── MULTI_SELECT ────────────────────────────────────────────────────────────
  if (field.type === 'MULTI_SELECT') {
    const opts = field.options || [];
    const selected: string[] = Array.isArray(value) ? value : [];
    const toggle = (val: string) => {
      const next = selected.includes(val)
        ? selected.filter(v => v !== val)
        : [...selected, val];
      onChange(field.key, next);
    };

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        <View style={styles.multiSelectContainer}>
          {opts.map(opt => {
            const active = selected.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => toggle(opt.value)}
              >
                <Text style={[styles.chipLabel, active && { color: '#FFFFFF' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── CHECKBOX ────────────────────────────────────────────────────────────────
  if (field.type === 'CHECKBOX') {
    const checked = Boolean(value);
    return (
      <View style={styles.fieldContainer}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => onChange(field.key, !checked)}
        >
          <Checkbox
            status={checked ? 'checked' : 'unchecked'}
            onPress={() => onChange(field.key, !checked)}
            color={theme.colors.primary}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
            {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── BOOLEAN ─────────────────────────────────────────────────────────────────
  if (field.type === 'BOOLEAN') {
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.boolRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
            {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
          </View>
          <Switch
            value={Boolean(value)}
            onValueChange={(v) => onChange(field.key, v)}
            color={theme.colors.primary}
          />
        </View>
      </View>
    );
  }

  // ── FILE / MULTI_FILE (info only, no upload yet) ─────────────────────────
  if (field.type === 'FILE' || field.type === 'MULTI_FILE') {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{field.label}{isRequired ? ' *' : ''}</Text>
        <View style={[styles.fileBox, { borderColor: theme.colors.primary + '40' }]}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600', marginBottom: 4 }}>📎 File Upload</Text>
          <Text style={styles.hint}>File uploads will be supported soon. Use the additional message field to describe your files.</Text>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1B4B',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  optionsContainer: {
    gap: 8,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    marginBottom: 6,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  boolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
});
