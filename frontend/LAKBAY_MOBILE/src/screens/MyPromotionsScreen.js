import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Modal, ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import {
  getPromotions,
  publishPromotion,
  getPublishCost,
  getWallet,
} from '../api/promotionService';
import VintaStripe from '../components/VintaStripe';

const getCuratorRank = (publishedCount) => {
  if (publishedCount >= 3) {
    return { title: 'Master Landmark Architect', icon: '🏛️', color: COLORS.gold };
  }
  if (publishedCount >= 1) {
    return { title: 'City Chronicler', icon: '📜', color: '#38BDF8' };
  }
  return { title: 'Novice Scout', icon: '🧭', color: '#A78BFA' };
};

export default function MyPromotionsScreen({ navigation }) {
  const [promotions, setPromotions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishCost, setPublishCost] = useState(50);

  // Modal States
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [insufficientModalVisible, setInsufficientModalVisible] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [promoData, cost, walletData] = await Promise.all([
        getPromotions(),
        getPublishCost(),
        getWallet().catch(() => null),
      ]);
      const list = Array.isArray(promoData) ? promoData : (promoData?.results || []);
      setPromotions(list);
      setPublishCost(cost || 50);
      if (walletData) setWallet(walletData);
    } catch (e) {
      console.log('Error fetching promotions', e);
      Alert.alert('Error', 'Failed to load your promotions.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayAndPublish = (promo) => {
    setSelectedPromo(promo);
    const balance = wallet?.balance ?? 0;
    if (balance < publishCost) {
      setInsufficientModalVisible(true);
    } else {
      setConfirmModalVisible(true);
    }
  };

  const executePublish = async () => {
    if (!selectedPromo) return;
    setPublishing(true);
    try {
      await publishPromotion(selectedPromo.id);
      setConfirmModalVisible(false);
      Alert.alert(
        'Landmark Published! 🎉',
        `"${selectedPromo.spot_name}" is now live on the interactive map for all explorers across Zamboanga City!`
      );
      fetchData();
    } catch (e) {
      console.log('Publish error:', e.response?.data);
      setConfirmModalVisible(false);
      if (e.response?.status === 402) {
        setInsufficientModalVisible(true);
      } else {
        const errMsg = e.response?.data?.detail || 'Failed to publish promotion.';
        Alert.alert('Error', errMsg);
      }
    } finally {
      setPublishing(false);
    }
  };

  // Stats calculation
  const publishedCount = promotions.filter(p => p.status === 'PUBLISHED').length;
  const approvedCount  = promotions.filter(p => p.status === 'APPROVED_PENDING_PAYMENT').length;
  const pendingCount   = promotions.filter(p => p.status === 'PENDING_REVIEW').length;
  const curatorRank    = getCuratorRank(publishedCount);

  const renderStatusConfig = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return {
          label: 'UNDER REVIEW',
          color: '#F59E0B',
          icon: 'hourglass-outline',
          step: 2,
        };
      case 'APPROVED_PENDING_PAYMENT':
        return {
          label: 'READY TO PUBLISH',
          color: COLORS.gold,
          icon: 'sparkles',
          step: 3,
        };
      case 'PUBLISHED':
        return {
          label: 'LIVE ON MAP',
          color: '#10B981',
          icon: 'earth',
          step: 4,
        };
      case 'REJECTED':
        return {
          label: 'ACTION REQUIRED',
          color: '#EF4444',
          icon: 'alert-circle',
          step: 2,
        };
      default:
        return {
          label: status.replace(/_/g, ' '),
          color: COLORS.textMuted,
          icon: 'information-circle-outline',
          step: 1,
        };
    }
  };

  const renderItem = ({ item }) => {
    const config = renderStatusConfig(item.status);
    const isApproved = item.status === 'APPROVED_PENDING_PAYMENT';
    const isPublished = item.status === 'PUBLISHED';
    const isRejected = item.status === 'REJECTED';
    const isPending = item.status === 'PENDING_REVIEW';
    const balance = wallet?.balance ?? 0;
    const canAfford = balance >= publishCost;

    return (
      <View style={[styles.card, isApproved && styles.cardApprovedGlow]}>
        {/* Left Status Strip */}
        <View style={[styles.cardStrip, { backgroundColor: config.color }]} />

        <View style={styles.cardContent}>
          {/* Top Row: Spot Name + Status Badge */}
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.spotName} numberOfLines={1}>{item.spot_name}</Text>
              <Text style={styles.promoSubInfo}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Expedition Submission'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color + '66' }]}>
              <Ionicons name={config.icon} size={11} color={config.color} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {/* 4-Stage Quest Stepper */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepTrack}>
              <View style={[styles.stepTrackFill, { width: `${(config.step / 4) * 100}%`, backgroundColor: config.color }]} />
            </View>
            <View style={styles.stepLabelsRow}>
              <Text style={[styles.stepLabel, config.step >= 1 && { color: '#FFFFFF' }]}>1. Draft</Text>
              <Text style={[styles.stepLabel, config.step >= 2 && { color: config.step === 2 && isRejected ? '#EF4444' : '#FFFFFF' }]}>
                2. Review
              </Text>
              <Text style={[styles.stepLabel, config.step >= 3 && { color: '#FFFFFF' }]}>3. Payment</Text>
              <Text style={[styles.stepLabel, config.step >= 4 && { color: '#FFFFFF' }]}>4. Live 🌐</Text>
            </View>
          </View>

          {/* Dynamic Status Callout & Actions */}
          {isApproved && (
            <View style={styles.approvedActionBox}>
              <View style={styles.approvedBannerHeader}>
                <Ionicons name="sparkles" size={16} color={COLORS.gold} />
                <Text style={styles.approvedBannerText}>Landmark Approved by Guild Admin!</Text>
              </View>
              <Text style={styles.approvedBannerSub}>
                Pay {publishCost} Coins to broadcast this landmark live on every explorer's radar.
              </Text>

              <TouchableOpacity
                style={styles.publishBtn}
                onPress={() => handlePayAndPublish(item)}
                disabled={publishing}
                activeOpacity={0.85}
              >
                <Ionicons name="rocket-outline" size={17} color="#08143C" />
                <Text style={styles.publishBtnText}>
                  Pay & Publish Live ({publishCost} Coins)
                </Text>
              </TouchableOpacity>

              {!canAfford && (
                <TouchableOpacity
                  style={styles.shortageNotice}
                  onPress={() => navigation.navigate('Store')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="alert-circle-outline" size={13} color={COLORS.gold} />
                  <Text style={styles.shortageNoticeText}>
                    Short by {publishCost - balance} coins — Tap to top up in Store →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isPublished && (
            <View style={styles.publishedBox}>
              <View style={styles.publishedHeader}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.teal} />
                <Text style={styles.publishedTitle}>Active on Zamboanga City Map</Text>
              </View>
              <Text style={styles.publishedSub}>
                Explorers can now locate this spot, scan its markers, and earn expedition badges.
              </Text>
              <TouchableOpacity
                style={styles.viewMapBtn}
                onPress={() => navigation.navigate('Map')}
                activeOpacity={0.85}
              >
                <Ionicons name="map-outline" size={15} color="#FFFFFF" />
                <Text style={styles.viewMapBtnText}>View on Interactive Map 📍</Text>
              </TouchableOpacity>
            </View>
          )}

          {isPending && (
            <View style={styles.pendingBox}>
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
              <Text style={styles.pendingText}>
                Under review by Tourism Guild moderators. You'll receive an expedition alert once approved!
              </Text>
            </View>
          )}

          {isRejected && (
            <View style={styles.rejectedBox}>
              <View style={styles.rejectedHeader}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={styles.rejectedTitle}>Feedback from Guild Admin</Text>
              </View>
              <Text style={styles.rejectionText}>
                {item.rejection_reason || 'Please review your landmark description and photo.'}
              </Text>
              <TouchableOpacity
                style={styles.resubmitBtn}
                onPress={() => navigation.navigate('Promote')}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                <Text style={styles.resubmitBtnText}>Submit Revised Landmark</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

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
            <Text style={styles.headerTitle}>CITY CURATOR</Text>
            <Text style={styles.headerSub}>EXPEDITION LANDMARKS</Text>
          </View>

          {/* Treasury Coin Pill */}
          <TouchableOpacity
            style={styles.walletPill}
            onPress={() => navigation.navigate('Store')}
            activeOpacity={0.8}
          >
            <Ionicons name="cash" size={13} color={COLORS.gold} />
            <Text style={styles.walletPillText}>{wallet?.balance ?? 0}</Text>
            <View style={styles.walletPlusBadge}>
              <Text style={styles.walletPlusText}>+</Text>
            </View>
          </TouchableOpacity>
        </View>

        <VintaStripe height={3} />

        {/* ── Curator Vault Card ── */}
        <View style={styles.curatorCard}>
          <View style={styles.curatorTopRow}>
            <View style={styles.curatorTitleWrap}>
              <View style={[styles.curatorRankBadge, { borderColor: curatorRank.color + '66' }]}>
                <Text style={styles.curatorRankIcon}>{curatorRank.icon}</Text>
              </View>
              <View>
                <Text style={styles.curatorRankLabel}>CURATOR REPUTATION</Text>
                <Text style={[styles.curatorRankTitle, { color: curatorRank.color }]}>
                  {curatorRank.title}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.newSpotBtn}
              onPress={() => navigation.navigate('Promote')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={15} color="#08143C" />
              <Text style={styles.newSpotBtnText}>New Spot</Text>
            </TouchableOpacity>
          </View>

          {/* Stat Pills Grid */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillNum}>{promotions.length}</Text>
              <Text style={styles.statPillLabel}>Total Spots</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={[styles.statPillNum, { color: '#10B981' }]}>{publishedCount}</Text>
              <Text style={styles.statPillLabel}>Live on Map</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={[styles.statPillNum, { color: approvedCount > 0 ? COLORS.gold : '#FFFFFF' }]}>
                {approvedCount}
              </Text>
              <Text style={styles.statPillLabel}>Approved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={[styles.statPillNum, { color: '#F59E0B' }]}>{pendingCount}</Text>
              <Text style={styles.statPillLabel}>In Review</Text>
            </View>
          </View>
        </View>

        {/* ── Content Body ── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Syncing Curator Logbook...</Text>
          </View>
        ) : promotions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="compass-outline" size={50} color={COLORS.gold} />
            </View>
            <Text style={styles.emptyTitle}>Begin Your Curator Quest! 🗺️</Text>
            <Text style={styles.emptySub}>
              Have a favorite historical spot, landmark, or hidden gem in Zamboanga? Submit it for guild review, earn explorer prestige, and broadcast it to thousands of tourists!
            </Text>
            <TouchableOpacity
              style={styles.emptySubmitBtn}
              onPress={() => navigation.navigate('Promote')}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={17} color="#08143C" />
              <Text style={styles.emptySubmitBtnText}>Submit Your First Landmark</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={promotions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* ── Insufficient Coins Modal ── */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={insufficientModalVisible}
          onRequestClose={() => setInsufficientModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <VintaStripe height={4} />

              <View style={styles.modalIconBoxAlert}>
                <Ionicons name="wallet-outline" size={32} color={COLORS.gold} />
              </View>

              <Text style={styles.modalTitle}>Treasury Shortage</Text>
              <Text style={styles.modalBody}>
                Publishing <Text style={{ fontFamily: FONTS.bold, color: '#FFFFFF' }}>"{selectedPromo?.spot_name}"</Text> requires{' '}
                <Text style={{ color: COLORS.gold, fontFamily: FONTS.bold }}>{publishCost} Coins</Text>.
              </Text>

              {/* Math Breakdown Table */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Required Fee:</Text>
                  <Text style={[styles.breakdownValue, { color: '#FFFFFF' }]}>{publishCost} Coins</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Current Balance:</Text>
                  <Text style={[styles.breakdownValue, { color: COLORS.gold }]}>
                    {wallet?.balance ?? 0} Coins
                  </Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabelShortage}>Coins Needed:</Text>
                  <Text style={styles.breakdownValueShortage}>
                    {Math.max(0, publishCost - (wallet?.balance ?? 0))} Coins
                  </Text>
                </View>
              </View>

              <Text style={styles.modalSubBody}>
                Instantly replenish your expedition coins in the Store using universal QR Ph (GCash, Maya, or any PH bank app).
              </Text>

              <View style={styles.modalActionsStacked}>
                <TouchableOpacity
                  style={styles.modalBtnStore}
                  onPress={() => {
                    setInsufficientModalVisible(false);
                    navigation.navigate('Store');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cart-outline" size={18} color="#08143C" />
                  <Text style={styles.modalBtnStoreText}>Top Up Coins (QR Ph) →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtnCancelStacked}
                  onPress={() => setInsufficientModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnCancelText}>Return to Curator Screen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Confirm Payment Modal ── */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={confirmModalVisible}
          onRequestClose={() => {
            if (!publishing) setConfirmModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <VintaStripe height={4} />

              <View style={styles.modalIconBox}>
                <Ionicons name="rocket" size={32} color={COLORS.teal} />
              </View>

              <Text style={styles.modalTitle}>Launch Landmark Live</Text>
              <Text style={styles.modalBody}>
                Publishing <Text style={{ fontFamily: FONTS.bold, color: '#FFFFFF' }}>"{selectedPromo?.spot_name}"</Text> will deduct{' '}
                <Text style={{ color: COLORS.gold, fontFamily: FONTS.bold }}>{publishCost} Coins</Text> from your expedition treasury.
              </Text>

              {/* Breakdown Card */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Publishing Cost:</Text>
                  <Text style={[styles.breakdownValue, { color: COLORS.gold }]}>{publishCost} Coins</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Current Treasury:</Text>
                  <Text style={[styles.breakdownValue, { color: '#FFFFFF' }]}>
                    {wallet?.balance ?? 0} Coins
                  </Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Remaining Balance:</Text>
                  <Text style={[styles.breakdownValue, { color: COLORS.teal }]}>
                    {(wallet?.balance ?? 0) - publishCost} Coins
                  </Text>
                </View>
              </View>

              <Text style={styles.modalSubBody}>
                Upon publication, your spot appears immediately on the interactive map for all explorers and tourists!
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalBtnCancel}
                  onPress={() => setConfirmModalVisible(false)}
                  disabled={publishing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtnConfirm}
                  onPress={executePublish}
                  disabled={publishing}
                  activeOpacity={0.85}
                >
                  {publishing ? (
                    <ActivityIndicator size="small" color="#08143C" />
                  ) : (
                    <Text style={styles.modalBtnConfirmText}>Pay {publishCost} Coins 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  container: { flex: 1 },

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
  headerCenter: { alignItems: 'center' },
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
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
    borderRadius: RADIUS.pill,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
  },
  walletPillText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gold,
  },
  walletPlusBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletPlusText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#08143C',
    lineHeight: 13,
  },

  /* ── Curator Vault Card ── */
  curatorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(8, 20, 60, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    ...SHADOW.card,
  },
  curatorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  curatorTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  curatorRankBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  curatorRankIcon: { fontSize: 18 },
  curatorRankLabel: {
    fontFamily: FONTS.medium,
    fontSize: 8.5,
    color: 'rgba(191, 215, 255, 0.60)',
    letterSpacing: 1.2,
  },
  curatorRankTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  newSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    ...SHADOW.gold,
  },
  newSpotBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#08143C',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(4, 12, 38, 0.50)',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.15)',
  },
  statPill: {
    alignItems: 'center',
    flex: 1,
  },
  statPillNum: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  statPillLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(191, 215, 255, 0.60)',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(99, 179, 237, 0.20)',
  },

  /* ── Content List ── */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8, 20, 60, 0.65)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.22)',
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  cardApprovedGlow: {
    borderColor: 'rgba(251, 191, 36, 0.55)',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardStrip: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  spotName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  promoSubInfo: {
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    color: 'rgba(191, 215, 255, 0.55)',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: 'rgba(191, 215, 255, 0.75)',
    lineHeight: 18,
    marginBottom: 10,
  },

  /* ── Quest Stepper ── */
  stepperContainer: {
    marginVertical: 6,
    paddingVertical: 6,
  },
  stepTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  stepTrackFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    color: 'rgba(191, 215, 255, 0.45)',
  },

  /* ── Status Action Boxes ── */
  approvedActionBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  approvedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  approvedBannerText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.gold,
  },
  approvedBannerSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.80)',
    marginBottom: 10,
    lineHeight: 16,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    ...SHADOW.gold,
  },
  publishBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: '#08143C',
    letterSpacing: 0.3,
  },
  shortageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  shortageNoticeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10.5,
    color: COLORS.gold,
  },

  publishedBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
  },
  publishedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  publishedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.teal,
  },
  publishedSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.75)',
    marginBottom: 8,
    lineHeight: 16,
  },
  viewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.30)',
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  viewMapBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  pendingText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.80)',
    flex: 1,
    lineHeight: 15,
  },

  rejectedBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.30)',
  },
  rejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rejectedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    color: '#EF4444',
  },
  rejectionText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
    marginBottom: 8,
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  resubmitBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },

  /* ── Loading & Empty ── */
  loadingContainer: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(191, 215, 255, 0.70)',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOW.gold,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(191, 215, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  emptySubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    ...SHADOW.gold,
  },
  emptySubmitBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#08143C',
    letterSpacing: 0.3,
  },

  /* ── Modals ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 24, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#09153B',
    borderRadius: RADIUS.lg,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 179, 237, 0.35)',
    overflow: 'hidden',
    ...SHADOW.card,
  },
  modalIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.40)',
  },
  modalIconBoxAlert: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  modalBody: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(191, 215, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  breakdownCard: {
    width: '100%',
    backgroundColor: 'rgba(4, 12, 38, 0.65)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.22)',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(191, 215, 255, 0.65)',
  },
  breakdownValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(99, 179, 237, 0.20)',
    marginVertical: 2,
  },
  breakdownLabelShortage: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#EF4444',
  },
  breakdownValueShortage: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#EF4444',
  },
  modalSubBody: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191, 215, 255, 0.65)',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalActionsStacked: {
    width: '100%',
    gap: 10,
  },
  modalBtnStore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
    ...SHADOW.gold,
  },
  modalBtnStoreText: {
    fontFamily: FONTS.bold,
    fontSize: 13.5,
    color: '#08143C',
    letterSpacing: 0.3,
  },
  modalBtnCancelStacked: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalBtnCancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12.5,
    color: 'rgba(191, 215, 255, 0.80)',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    ...SHADOW.gold,
  },
  modalBtnConfirmText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#08143C',
  },
});
