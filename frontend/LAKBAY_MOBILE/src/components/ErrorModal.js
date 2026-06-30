import React, { useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ErrorModal — Polished error / alert modal for LAKBAY Mobile
 *
 * Props:
 *   visible      {boolean}                              — controls visibility
 *   type         {'error'|'warning'|'info'|'success'}  — semantic type (default 'error')
 *   title        {string}                               — bold heading
 *   message      {string}                               — body copy
 *   onClose      {() => void}                           — dismiss handler
 *   onConfirm    {() => void}                           — optional confirm action
 *   confirmLabel {string}                               — confirm button label (default 'OK')
 *   cancelLabel  {string}                               — cancel button label (default 'Dismiss')
 */
export default function ErrorModal({
  visible,
  type = 'error',
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = 'OK',
  cancelLabel = 'Dismiss',
}) {
  // ── Entrance animation ────────────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 14,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  // ── Type config ───────────────────────────────────────────────────
  const CONFIG = {
    error: {
      icon: 'close-circle',
      color: '#EF4444',
      colorSoft: 'rgba(239,68,68,0.12)',
      colorBorder: 'rgba(239,68,68,0.30)',
      glowColor: 'rgba(239,68,68,0.18)',
      label: title || 'Error',
      badge: 'ERROR',
    },
    warning: {
      icon: 'warning',
      color: '#F59E0B',
      colorSoft: 'rgba(245,158,11,0.12)',
      colorBorder: 'rgba(245,158,11,0.30)',
      glowColor: 'rgba(245,158,11,0.18)',
      label: title || 'Warning',
      badge: 'WARNING',
    },
    info: {
      icon: 'information-circle',
      color: COLORS.accent,
      colorSoft: COLORS.accentSoft,
      colorBorder: COLORS.accentBorder,
      glowColor: COLORS.accentGlow,
      label: title || 'Information',
      badge: 'INFO',
    },
    success: {
      icon: 'checkmark-circle',
      color: '#10B981',
      colorSoft: 'rgba(16,185,129,0.12)',
      colorBorder: 'rgba(16,185,129,0.30)',
      glowColor: 'rgba(16,185,129,0.18)',
      label: title || 'Success',
      badge: 'SUCCESS',
    },
  };

  const cfg = CONFIG[type] ?? CONFIG.error;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Card — stop propagation so tapping card doesn't close */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Top colour glow bar */}
            <View style={[styles.glowBar, { backgroundColor: cfg.color }]} />

            {/* Close button */}
            <TouchableOpacity style={styles.xBtn} onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Icon ring */}
            <View
              style={[
                styles.iconRing,
                {
                  backgroundColor: cfg.colorSoft,
                  borderColor: cfg.colorBorder,
                },
              ]}
            >
              <Ionicons name={cfg.icon} size={32} color={cfg.color} />
            </View>

            {/* Badge */}
            <View style={[styles.badge, { backgroundColor: cfg.colorSoft, borderColor: cfg.colorBorder }]}>
              <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.badge}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{cfg.label}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Buttons */}
            <View style={[styles.btnRow, onConfirm ? styles.dualRow : styles.singleRow]}>
              {onConfirm && (
                <TouchableOpacity style={styles.ghostBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.ghostBtnText}>{cancelLabel}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.solidBtn, { backgroundColor: cfg.color }]}
                onPress={onConfirm ?? onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.solidBtnText}>{onConfirm ? confirmLabel : cancelLabel}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Overlay ──────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 40, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },

  // ── Card ─────────────────────────────────────────────────────────
  card: {
    width: Math.min(SCREEN_WIDTH - 56, 360),
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.28,
        shadowRadius: 32,
      },
      android: { elevation: 16 },
    }),
  },

  // ── Glow bar ─────────────────────────────────────────────────────
  glowBar: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    width: 160,
    height: 64,
    borderRadius: 80,
    opacity: 0.45,
  },

  // ── Close (×) button ─────────────────────────────────────────────
  xBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Icon ring ─────────────────────────────────────────────────────
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 4,
  },

  // ── Badge ─────────────────────────────────────────────────────────
  badge: {
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.6,
  },

  // ── Title ─────────────────────────────────────────────────────────
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  // ── Message ───────────────────────────────────────────────────────
  message: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 0,
  },

  // ── Divider ───────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    width: '110%',
    marginTop: 22,
    marginBottom: 18,
  },

  // ── Button row ────────────────────────────────────────────────────
  btnRow: {
    width: '100%',
    gap: 10,
  },
  singleRow: { alignItems: 'center' },
  dualRow: { flexDirection: 'row' },

  ghostBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textSub,
  },

  solidBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  solidBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
