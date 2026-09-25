import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar,
  ScrollView, ImageBackground, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { useApp } from '../context/AppContext';
import VintaStripe from '../components/VintaStripe';

const TYPE_CONFIG = {
  scan:  { color: '#38BDF8', tag: 'SCAN',      iconName: 'scan-circle-outline'   },
  badge: { color: COLORS.gold, tag: 'BADGE',   iconName: 'medal-outline'         },
  catch: { color: '#34D399', tag: 'AR CATCH',  iconName: 'sparkles-outline'      },
  admin: { color: '#A78BFA', tag: 'COUNCIL',   iconName: 'shield-checkmark-outline'},
  promo: { color: '#FBBF24', tag: 'LANDMARK',  iconName: 'megaphone-outline'     },
  xp:    { color: '#F97316', tag: 'REWARD',    iconName: 'flame-outline'         },
};

const FILTERS = [
  { id: 'all',    label: 'All Logs',     icon: 'list'     },
  { id: 'promo',  label: 'Landmarks',    icon: 'megaphone'},
  { id: 'quest',  label: 'Quests & XP',  icon: 'flame'    },
  { id: 'scan',   label: 'Scans',        icon: 'scan'     },
];

export default function NotificationScreen({ navigation }) {
  const { notifs, clearNotifications, markNotificationRead } = useApp();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    notifs.forEach(n => {
      if (!n.read) markNotificationRead(n.id);
    });
  };

  const handleClearAll = () => {
    if (notifs.length === 0) return;
    Alert.alert(
      'Clear Expedition Log',
      'Are you sure you want to clear all notifications from your expedition log?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearNotifications },
      ]
    );
  };

  const filteredNotifs = notifs.filter(n => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'promo') return n.type === 'promo' || n.type === 'admin';
    if (selectedFilter === 'quest') return n.type === 'xp' || n.type === 'badge' || n.type === 'catch';
    if (selectedFilter === 'scan') return n.type === 'scan';
    return true;
  });

  return (
    <ImageBackground
      source={require('../../reference/VINTA.jpeg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>EXPEDITION LOG</Text>
            <Text style={styles.headerSub}>TRAVEL & GUILD NOTICES</Text>
          </View>

          {/* Unread Pill or Clear */}
          <View style={styles.headerRight}>
            {unreadCount > 0 ? (
              <TouchableOpacity
                style={styles.markReadPill}
                onPress={handleMarkAllRead}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={13} color={COLORS.gold} />
                <Text style={styles.markReadText}>Read All</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearAll}
                disabled={notifs.length === 0}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={notifs.length > 0 ? 'rgba(191,215,255,0.8)' : 'rgba(191,215,255,0.3)'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <VintaStripe height={3} />

        {/* ── Stat Tracker Bar ── */}
        <View style={styles.trackerBar}>
          <View style={styles.trackerItem}>
            <Text style={styles.trackerLabel}>TOTAL LOGS</Text>
            <Text style={styles.trackerValue}>{notifs.length}</Text>
          </View>
          <View style={styles.trackerDivider} />
          <View style={styles.trackerItem}>
            <Text style={styles.trackerLabel}>UNREAD ALERTS</Text>
            <Text style={[styles.trackerValue, { color: unreadCount > 0 ? COLORS.gold : '#FFFFFF' }]}>
              {unreadCount}
            </Text>
          </View>
          <View style={styles.trackerDivider} />
          <View style={styles.trackerItem}>
            <Text style={styles.trackerLabel}>STATUS</Text>
            <Text style={[styles.trackerValue, { color: COLORS.teal }]}>
              {unreadCount === 0 ? 'SYNCHRONIZED' : 'UPDATES PENDING'}
            </Text>
          </View>
        </View>

        {/* ── Filter Pills ── */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTERS.map(f => {
              const active = selectedFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setSelectedFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={f.icon}
                    size={13}
                    color={active ? '#08143C' : 'rgba(191,215,255,0.75)'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Notification List ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {filteredNotifs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="compass-outline" size={44} color={COLORS.gold} />
              </View>
              <Text style={styles.emptyTitle}>Logbook Clear, Explorer!</Text>
              <Text style={styles.emptySub}>
                {selectedFilter === 'all'
                  ? 'No notifications right now. Scan QR monuments, claim login streaks, or submit landmarks to fill your expedition diary.'
                  : `No logs found under "${FILTERS.find(f => f.id === selectedFilter)?.label}".`}
              </Text>
              {selectedFilter !== 'all' && (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => setSelectedFilter('all')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetFilterBtnText}>Show All Logs</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.list}>
              {filteredNotifs.map((n, idx) => {
                const conf = TYPE_CONFIG[n.type] || TYPE_CONFIG.admin;
                const notifKey = n.id ? `${n.id}-${idx}` : `notif-${idx}`;
                const isUnread = !n.read;

                return (
                  <TouchableOpacity
                    key={notifKey}
                    style={[
                      styles.card,
                      isUnread && styles.cardUnread,
                      isUnread && { borderColor: conf.color + '77' },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      markNotificationRead(n.id);
                      if (n.screen) navigation.navigate(n.screen);
                    }}
                  >
                    {/* Glowing Left Indicator Strip */}
                    <View style={[styles.cardStrip, { backgroundColor: conf.color }]} />

                    {/* Left Icon Avatar */}
                    <View style={[styles.iconWrap, { backgroundColor: conf.color + '22', borderColor: conf.color + '66' }]}>
                      {n.icon ? (
                        <Text style={styles.iconEmoji}>{n.icon}</Text>
                      ) : (
                        <Ionicons name={conf.iconName} size={20} color={conf.color} />
                      )}
                    </View>

                    {/* Main Content */}
                    <View style={styles.contentWrap}>
                      <View style={styles.cardTopRow}>
                        <View style={[styles.tagPill, { backgroundColor: conf.color + '26', borderColor: conf.color + '66' }]}>
                          <Text style={[styles.tagText, { color: conf.color }]}>{conf.tag}</Text>
                        </View>
                        <View style={styles.timeWrap}>
                          <Ionicons name="time-outline" size={11} color="rgba(191,215,255,0.55)" />
                          <Text style={styles.timeText}>{n.time || 'Just now'}</Text>
                          {isUnread && <View style={styles.unreadGlowDot} />}
                        </View>
                      </View>

                      <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                      <Text style={styles.cardSub} numberOfLines={3}>{n.sub}</Text>

                      {/* Interactive Action Prompt for Actionable Notifs */}
                      {n.screen && (
                        <View style={styles.cardActionRow}>
                          <View style={styles.actionPromptPill}>
                            <Text style={styles.actionPromptText}>
                              {n.screen === 'MyPromotions' ? 'Open Curator Screen' : 'View Adventure'}
                            </Text>
                            <Ionicons name="arrow-forward" size={12} color={COLORS.gold} />
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 36 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 24, 0.88)',
  },
  container: {
    flex: 1,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(8, 20, 60, 0.75)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 18,
  },
  headerSub: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191, 215, 255, 0.70)',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  headerRight: {
    minWidth: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markReadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markReadText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Stat Tracker Bar ── */
  trackerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.20)',
    ...SHADOW.card,
  },
  trackerItem: {
    alignItems: 'center',
    flex: 1,
  },
  trackerLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191, 215, 255, 0.60)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  trackerValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  trackerDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(99, 179, 237, 0.20)',
  },

  /* ── Filter Pills ── */
  filterContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.20)',
  },
  filterPillActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
    ...SHADOW.gold,
  },
  filterText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.75)',
    letterSpacing: 0.3,
  },
  filterTextActive: {
    color: '#08143C',
    fontFamily: FONTS.bold,
  },

  /* ── List Content ── */
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8, 20, 60, 0.65)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.22)',
    overflow: 'hidden',
    ...SHADOW.card,
  },
  cardUnread: {
    backgroundColor: 'rgba(11, 28, 77, 0.85)',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cardStrip: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginLeft: 12,
    marginRight: 4,
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
  },
  contentWrap: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: 'rgba(191, 215, 255, 0.55)',
  },
  unreadGlowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.gold,
    marginLeft: 4,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  cardSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.75)',
    lineHeight: 17,
  },
  cardActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  actionPromptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionPromptText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 0.3,
  },

  /* ── Empty State ── */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOW.gold,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(191, 215, 255, 0.70)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  resetFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.30)',
  },
  resetFilterBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.accentBorder,
  },
});
