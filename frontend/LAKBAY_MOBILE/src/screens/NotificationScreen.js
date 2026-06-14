import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

const INITIAL_NOTIFS = [
  { id: 1, type: 'scan',  icon: '📷', title: 'QR Scanned!',            sub: 'You unlocked Fort Pilar spot — +50 XP',             time: '2m ago',  read: false },
  { id: 2, type: 'badge', icon: '🏅', title: 'Badge Unlocked!',        sub: 'You earned the \'City Explorer\' badge',             time: '1h ago',  read: false },
  { id: 3, type: 'catch', icon: '🦀', title: 'Catch Complete!',        sub: 'Curacha captured at Fort Pilar Museum — +80 XP',    time: '3h ago',  read: true  },
  { id: 4, type: 'scan',  icon: '🗺️', title: 'New Hotspot Nearby!',   sub: 'Santa Cruz Island is 2km from your location',       time: '1d ago',  read: true  },
  { id: 5, type: 'badge', icon: '✨', title: 'Milestone Reached!',     sub: 'You\'ve visited 5 cultural spots in Zamboanga City', time: '2d ago',  read: true  },
];

const TYPE_COLOR = { scan: COLORS.accent, badge: COLORS.gold, catch: COLORS.teal };

export default function NotificationScreen({ navigation }) {
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);

  const clearAll = () => setNotifs([]);
  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={clearAll} disabled={unreadCount === 0 && notifs.length === 0}>
          <Text style={[styles.clearText, (unreadCount === 0 && notifs.length === 0) && styles.clearTextDisabled]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {notifs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>No new notifications right now.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifs.map(n => {
              const color = TYPE_COLOR[n.type] || COLORS.accent;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                  activeOpacity={0.85}
                  onPress={() =>
                    setNotifs(prev =>
                      prev.map(x => x.id === n.id ? { ...x, read: true } : x)
                    )
                  }
                >
                  {/* Left accent line */}
                  <View style={[styles.accentLine, { backgroundColor: color }]} />

                  {/* Icon bubble */}
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: color + '22', borderColor: color + '44' },
                    ]}
                  >
                    <Text style={styles.notifIcon}>{n.icon}</Text>
                  </View>

                  {/* Text content */}
                  <View style={styles.notifContent}>
                    <View style={styles.notifTitleRow}>
                      <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                      {!n.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifSub} numberOfLines={2}>{n.sub}</Text>
                    <Text style={styles.notifTime}>{n.time}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ── Layout ── */
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* ── Header ── */
  header: {
    height: 60,
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accentBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backArrow: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  unreadPill: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FFF',
  },
  clearBtn: {
    paddingHorizontal: 4,
  },
  clearText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.accent,
  },
  clearTextDisabled: {
    color: COLORS.textMuted,
  },

  /* ── Scroll ── */
  scroll: {
    padding: 16,
  },

  /* ── Notification List ── */
  list: {
    gap: 10,
  },
  notifCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOW.card,
  },
  notifCardUnread: {
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.bgCardAlt,
  },
  accentLine: {
    width: 3,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    flexShrink: 0,
  },
  notifIcon: {
    fontSize: 20,
  },
  notifContent: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: 8,
  },
  notifSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSub,
    lineHeight: 17,
    marginBottom: 6,
  },
  notifTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
  },

  /* ── Empty State ── */
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
