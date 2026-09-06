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
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'rgba(8, 20, 56, 0.98)',
    borderRadius: RADIUS.lg,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 179, 237, 0.35)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    width: 160,
    height: 60,
    borderRadius: 80,
    opacity: 0.45,
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
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#E2E8F0',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  cancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#E2E8F0',
  },
  proceedWrapper: {
    flex: 1,
  },
});
