import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from './CustomButton';

export default function CustomModal({ visible, title, message, icon, color, onClose, onProceed }) {
  const themeColor = color || COLORS.accent;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Decorative Top Accent Bar */}
          <View style={[styles.topBar, { backgroundColor: themeColor }]} />
          
          <View style={styles.iconContainer}>
            <View style={[styles.iconRing, { borderColor: themeColor, backgroundColor: themeColor + '22' }]}>
              <Ionicons name={icon || "information-circle"} size={32} color={themeColor} />
            </View>
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <View style={styles.proceedWrapper}>
              <CustomButton
                title="Proceed"
                onPress={onProceed}
                variant="primary"
                style={{ height: 44, paddingHorizontal: 20, backgroundColor: themeColor }}
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
    maxWidth: 360,
    backgroundColor: 'rgba(8, 20, 56, 0.98)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 179, 237, 0.35)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    marginBottom: 26,
    lineHeight: 22,
    paddingHorizontal: 8,
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
