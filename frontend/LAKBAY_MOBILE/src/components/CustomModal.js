import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from './CustomButton';

export default function CustomModal({ visible, title, message, icon, color, onClose, onProceed }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Decorative Top Glow */}
          <View style={[styles.glow, { backgroundColor: color || COLORS.accent }]} />
          
          <View style={styles.iconContainer}>
            <View style={[styles.iconRing, { borderColor: color || COLORS.accent, backgroundColor: (color || COLORS.accent) + '15' }]}>
              <Ionicons name={icon || "information-circle"} size={32} color={color || COLORS.accent} />
            </View>
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <View style={styles.proceedWrapper}>
              <CustomButton
                title="Proceed"
                onPress={onProceed}
                variant="primary"
                style={{ height: 44, paddingHorizontal: 20, backgroundColor: color || COLORS.accent }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    // no-op — removed decorative glow blob
    display: 'none',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#475569',
  },
  proceedWrapper: {
    flex: 1,
  },
});
