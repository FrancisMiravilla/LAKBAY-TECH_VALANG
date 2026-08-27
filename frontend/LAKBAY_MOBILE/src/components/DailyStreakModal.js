import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import VintaStripe from './VintaStripe';

export default function DailyStreakModal({
  visible,
  streak = 1,
  claimed = false,
  onClaim,
  onClose,
  loading = false,
}) {
  const displayStreak = Math.max(1, streak);
  const cycleDay = ((displayStreak - 1) % 7) + 1; // 1 to 7

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top accent bar */}
          <View style={styles.topBar} />

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color="rgba(191,215,255,0.7)" />
          </TouchableOpacity>

          {/* Flame Badge */}
          <View style={styles.flameCircle}>
            <Ionicons name="flame" size={44} color="#FBBF24" />
          </View>

          {/* Header Title */}
          <Text style={styles.title}>
            DAILY STREAK: {displayStreak} {displayStreak === 1 ? 'DAY' : 'DAYS'}!
          </Text>

          <View style={{ width: '80%', marginVertical: 8 }}>
            <VintaStripe height={3} />
          </View>

          <Text style={styles.subtitle}>
            {claimed
              ? `Awesome! You've claimed your +10 XP for today. Come back tomorrow to keep the flame alive!`
              : `Log in every day to keep your adventure streak going and level up your Explorer rank!`}
          </Text>

          {/* ── 7-Day Streak Tracker ── */}
          <View style={styles.trackerContainer}>
            <Text style={styles.trackerLabel}>WEEKLY PROGRESS (DAY {cycleDay}/7)</Text>
            <View style={styles.dotsRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                const isPassed = dayNum < cycleDay;
                const isCurrent = dayNum === cycleDay;
                return (
                  <View key={dayNum} style={styles.dayItem}>
                    <View
                      style={[
                        styles.dayDot,
                        isPassed && styles.dayDotPassed,
                        isCurrent && styles.dayDotCurrent,
                      ]}
                    >
                      <Ionicons
                        name={isPassed ? 'checkmark' : isCurrent ? 'flame' : 'radio-button-off'}
                        size={isCurrent ? 16 : 12}
                        color={isCurrent ? '#FBBF24' : isPassed ? '#10B981' : 'rgba(191,215,255,0.3)'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.dayText,
                        isCurrent && styles.dayTextCurrent,
                        isPassed && styles.dayTextPassed,
                      ]}
                    >
                      D{dayNum}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Reward Box ── */}
          <View style={styles.rewardCard}>
            <View style={styles.rewardLeft}>
              <Ionicons name="sparkles" size={20} color="#FBBF24" />
              <View>
                <Text style={styles.rewardTitle}>TODAY'S REWARD</Text>
                <Text style={styles.rewardSub}>Daily Login Bonus</Text>
              </View>
            </View>
            <View style={styles.xpChip}>
              <Text style={styles.xpChipText}>+10 XP</Text>
            </View>
          </View>

          {/* ── Action Buttons ── */}
          {claimed ? (
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.doneBtnText}>Claimed for Today!</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.claimBtn, loading && styles.claimBtnLoading]}
              onPress={onClaim}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="gift-outline" size={18} color="#fff" />
                  <Text style={styles.claimBtnText}>Claim +10 XP</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 10, 38, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(8, 20, 60, 0.96)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.gold,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 179, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.3)',
    zIndex: 10,
  },
  flameCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  title: {
    fontFamily: FONTS.pixel,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },

  // ── 7-Day Tracker ──
  trackerContainer: {
    width: '100%',
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  trackerLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayItem: {
    alignItems: 'center',
    gap: 4,
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotPassed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  dayDotCurrent: {
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    borderColor: '#FBBF24',
    transform: [{ scale: 1.08 }],
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  dayText: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191, 215, 255, 0.5)',
  },
  dayTextPassed: {
    color: '#10B981',
  },
  dayTextCurrent: {
    fontFamily: FONTS.bold,
    color: '#FBBF24',
  },

  // ── Reward Card ──
  rewardCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  rewardSub: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: 'rgba(191, 215, 255, 0.7)',
  },
  xpChip: {
    backgroundColor: '#FBBF24',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  xpChipText: {
    fontFamily: FONTS.pixel,
    fontSize: 10,
    color: '#0C2461',
    letterSpacing: 0.5,
  },

  // ── Buttons ──
  claimBtn: {
    width: '100%',
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.5)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  claimBtnLoading: {
    backgroundColor: 'rgba(26, 86, 219, 0.6)',
  },
  claimBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  doneBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#10B981',
    letterSpacing: 0.8,
  },
});
