import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated } from 'react-native';
import { COLORS, FONTS, RADIUS, onWhite } from '../constants/theme';
import VintaCard from './VintaCard';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from './CustomButton';

export default function CustomModal({ visible, title, message, icon, color, onClose, onProceed }) {
  const themeColor = color || COLORS.accent;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <VintaCard style={styles.modalFrame} contentStyle={styles.modalCard}>

          <View style={styles.iconContainer}>
            <View style={[styles.iconRing, { borderColor: themeColor, backgroundColor: themeColor + '22' }]}>
              <Ionicons name={icon || "information-circle"} size={32} color={onWhite(themeColor)} />
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
                style={{ height: 44, paddingHorizontal: 20, backgroundColor: COLORS.accent }}
              />
            </View>
          </View>
        </VintaCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalFrame: {
    width: '100%',
    maxWidth: 360,
  },
  modalCard: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.navy,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSub,
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
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textSub,
  },
  proceedWrapper: {
    flex: 1,
  },
});
