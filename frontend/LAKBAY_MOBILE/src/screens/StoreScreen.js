import { sizedImage } from '../utils/imageUrl';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Dimensions, StatusBar, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, GUIDE_FONTS, RADIUS } from '../constants/theme';
import VintaCard from '../components/VintaCard';
import {
  getWallet,
  getBundles,
  createBundleQRPh,
  verifyBundlePayment,
  simulateTestBundlePayment,
} from '../api/promotionService';
import { ORIGIN } from '../api/qrService';
import { useTabBarSpace } from '../navigation/tabBarLayout';
import { useVintaRefresh, VintaRefreshIndicator } from '../components/VintaRefresh';
import { CoinIcon, CoinPile, RaysGlow, Sparkles } from '../components/store/StoreArt';
import VintaStripe from '../components/VintaStripe';

import { useAppDialog } from '../components/useAppDialog';
const { width } = Dimensions.get('window');

// Game-shop look: the app's navy header with the coin balance, then colourful
// pack cards on a pale sky background.
const SHOP = {
  sky: '#E6F4FB',
  ink: '#16324F',
  inkSoft: '#5B7186',
  teal: '#1DB8A3',
  tealDark: '#0F8F7F',
  green: '#3BC45A',
  greenDark: '#22923B',
};
const GRID_PAD = 16;
const GRID_GAP = 14;
const CARD_W = (width - GRID_PAD * 2 - GRID_GAP) / 2;

const CARD_THEMES = [
  { colors: ['#7B6CF6', '#93A6FB', '#E1E8FF'], ink: '#3B2F9E' },
  { colors: ['#25BF7E', '#72DBA4', '#DDF8E8'], ink: '#126B45' },
  { colors: ['#FF973A', '#FFBD72', '#FFEBD2'], ink: '#A9500C' },
  { colors: ['#EF5A9A', '#F59BC3', '#FFE2EF'], ink: '#9C2560' },
  { colors: ['#21B1D4', '#73D1E8', '#DBF4FA'], ink: '#0D6A82' },
];


const formatPeso = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return `₱${v}`;
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
};

const COIN_IMAGE = 'https://cdn-icons-png.flaticon.com/512/2850/2850730.png';

const formatImageUrl = (img) => {
  if (!img) return COIN_IMAGE;
  if (img.startsWith('http://localhost:8000') || img.startsWith('http://127.0.0.1:8000')) {
    return img.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, ORIGIN);
  }
  if (img.startsWith('/media')) return `${ORIGIN}${img}`;
  return sizedImage(img, 400);
};

export default function StoreScreen({ navigation }) {
  const { dialog, showAlert } = useAppDialog();
  const tabBarSpace = useTabBarSpace();
  const [wallet, setWallet] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  // ── QR Ph Modal States ──
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState(null); // { payment_intent_id, qr_image_url, amount_php, coins_amount, bundle_name }
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'awaiting' | 'paid'
  const [verifying, setVerifying] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const { refreshing, refreshControl } = useVintaRefresh(() => fetchData());

  const fetchData = async () => {
    try {
      const [walletData, bundlesData] = await Promise.all([getWallet(), getBundles()]);
      setWallet(walletData);
      setBundles(bundlesData);
    } catch (e) {
      console.log('Error fetching store data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (bundle) => {
    setSelectedBundle(bundle);
    setBuying(true);
    setQrLoading(true);
    try {
      const data = await createBundleQRPh(bundle.id);
      setQrData(data);
      setPaymentStatus('awaiting');
      setQrModalVisible(true);
      startPolling(data.payment_intent_id);
    } catch (e) {
      console.log('Error generating bundle QR Ph', e);
      showAlert('Payment Error', 'Failed to generate QR Ph code. Please check server connection.');
    } finally {
      setBuying(false);
      setQrLoading(false);
    }
  };

  const startPolling = (paymentIntentId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await verifyBundlePayment(paymentIntentId);
        if (res.paid || res.status === 'succeeded') {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          handlePaymentSuccess(res);
        }
      } catch (e) {
        // background check
      }
    }, 3500);
  };

  const handleManualCheck = async () => {
    if (!qrData?.payment_intent_id || verifying) return;
    setVerifying(true);
    try {
      const res = await verifyBundlePayment(qrData.payment_intent_id);
      if (res.paid || res.status === 'succeeded') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        handlePaymentSuccess(res);
      } else {
        showAlert('Payment Pending', 'Payment confirmation has not yet arrived from PayMongo. Please scan the QR Ph code and approve payment.');
      }
    } catch (e) {
      showAlert('Error', 'Unable to verify payment with server.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTestPayment = async () => {
    if (!qrData?.payment_intent_id || verifying) return;
    setVerifying(true);
    try {
      const res = await simulateTestBundlePayment(qrData.payment_intent_id);
      if (res.paid) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        handlePaymentSuccess(res);
      }
    } catch (e) {
      showAlert('Error', 'Failed to simulate test payment.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentSuccess = (res) => {
    setPaymentStatus('paid');
    if (res.balance !== undefined) {
      setWallet(prev => ({ ...prev, balance: res.balance }));
    } else {
      fetchData();
    }
  };

  const handleCloseQRModal = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = null;
    setQrModalVisible(false);
    setPaymentStatus('idle');
    setQrData(null);
    setSelectedBundle(null);
    fetchData();
  };

  // ── Pack highlights ──
  const ratio = (b) => Number(b.coins_amount) / Math.max(Number(b.price_php) || 0, 0.01);
  const byPrice = useMemo(
    () => [...bundles].sort((a, b) => Number(a.price_php) - Number(b.price_php)),
    [bundles]
  );
  const bestValueId = useMemo(
    () => (bundles.length > 1 ? bundles.reduce((best, b) => (ratio(b) > ratio(best) ? b : best)).id : null),
    [bundles]
  );
  const starterId = byPrice.length > 1 && byPrice[0].id !== bestValueId ? byPrice[0].id : null;
  // Pile size 1..4 by how many coins a pack holds compared with the others.
  const tierOf = useMemo(() => {
    const order = [...bundles].sort((a, b) => a.coins_amount - b.coins_amount);
    const map = {};
    order.forEach((b, i) => {
      map[b.id] = order.length <= 1 ? 2 : 1 + Math.round((i * 3) / (order.length - 1));
    });
    return map;
  }, [bundles]);
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={SHOP.tealDark} />
        <Text style={styles.loadingText}>Opening the LAKBAY Store…</Text>
      </SafeAreaView>
    );
  }

  const renderBundleCard = ({ item }) => {
    const themeIdx = Math.max(0, byPrice.findIndex((b) => b.id === item.id));
    const theme = CARD_THEMES[themeIdx % CARD_THEMES.length];
    const busy = (buying || qrLoading) && selectedBundle?.id === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleBuy(item)}
        disabled={buying || qrLoading}
        activeOpacity={0.88}
      >
        <LinearGradient colors={theme.colors} locations={[0, 0.5, 1]} style={styles.cardGrad}>
          <View style={styles.cardShine} pointerEvents="none" />
          {item.id === starterId && (
            <View style={styles.ribbon} pointerEvents="none">
              <Text style={styles.ribbonText}>STARTER</Text>
            </View>
          )}

          <Text style={[styles.cardTitle, { textShadowColor: theme.ink }]} numberOfLines={2}>{item.name}</Text>

          <View style={styles.artWrap}>
            <View style={styles.artRays} pointerEvents="none">
              <RaysGlow size={CARD_W * 1.05} />
            </View>
            {item.image ? (
              <Image source={{ uri: formatImageUrl(item.image) }} style={styles.packImage} resizeMode="contain" />
            ) : (
              <CoinPile size={CARD_W * 0.8} tier={tierOf[item.id] || 1} />
            )}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Sparkles width={CARD_W - 16} height={CARD_W * 0.82} />
            </View>
          </View>

          <View style={styles.amountTag}>
            <CoinIcon size={16} />
            <Text style={styles.amountText}>{Number(item.coins_amount).toLocaleString()} coins</Text>
          </View>

          <View style={styles.priceBtn}>
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.priceBtnText}>{formatPeso(item.price_php)}</Text>
            )}
          </View>
          <Text style={[styles.cardCaption, { color: theme.ink }]} numberOfLines={1}>
            {item.description || 'Pay with QR Ph'}
          </Text>
        </LinearGradient>

        {item.id === bestValueId && (
          <View style={styles.sticker} pointerEvents="none">
            <Text style={styles.stickerText}>{'BEST\nVALUE'}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const balance = Number(wallet?.balance || 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header: title and coin balance ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>LAKBAY STORE</Text>
            <Text style={styles.headerSub}>EXPEDITION COIN VAULT</Text>
          </View>
          <View style={styles.balancePill}>
            <View style={styles.balanceCoin}>
              <CoinIcon size={30} />
            </View>
            <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
          </View>
        </View>
        <VintaStripe height={3} />
      </SafeAreaView>

      <View style={styles.content}>
        <FlatList
          key="2col"
          refreshControl={refreshControl}
          data={byPrice}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.grid, { paddingBottom: tabBarSpace }]}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={renderBundleCard}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHead}>
              <Text style={styles.sectionTitle}>Coin Packs</Text>
              <Text style={styles.sectionHint}>Coins pay for publishing your place or business promotion on the map.</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No coin packs available right now.</Text>}
        />
        <VintaRefreshIndicator visible={refreshing} />
      </View>

        {/* ── QR Ph Payment Modal for Coin Bundle ── */}
        <Modal
          visible={qrModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseQRModal}
        >
          <View style={styles.qrModalBackdrop}>
            <VintaCard style={styles.qrModalCard}>

              {/* Header */}
              <View style={styles.qrModalHeader}>
                <View style={styles.qrModalHeaderLeft}>
                  <View style={styles.qrPhIconWrap}>
                    <Text style={styles.qrPhIconText}>QR</Text>
                  </View>
                  <View>
                    <Text style={styles.qrModalHeaderTitle}>PayMongo QR Ph</Text>
                    <Text style={styles.qrModalHeaderSub}>National QR Standard</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.qrModalCloseBtn} onPress={handleCloseQRModal}>
                  <Ionicons name="close" size={20} color={COLORS.textSub} />
                </TouchableOpacity>
              </View>

              {paymentStatus === 'paid' ? (
                /* Success State */
                <View style={styles.qrSuccessWrap}>
                  <Ionicons name="checkmark-circle" size={64} color={COLORS.teal} />
                  <Text style={styles.qrSuccessTitle}>Payment Received!</Text>
                  <Text style={styles.qrSuccessCoins}>
                    +{qrData?.coins_amount || selectedBundle?.coins_amount} Gold Coins
                  </Text>
                  <Text style={styles.qrSuccessSub}>
                    Your treasure has been safely deposited into your Treasury Wallet! Current balance: {wallet?.balance} coins.
                  </Text>
                  <TouchableOpacity style={styles.qrSuccessBtn} onPress={handleCloseQRModal}>
                    <Text style={styles.qrSuccessBtnText}>Awesome, Done!</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Payment Waiting State */
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.qrModalBody}>
                  <View style={styles.qrBundlePill}>
                    <Ionicons name="sparkles" size={13} color={COLORS.gold} />
                    <Text style={styles.qrBundlePillText}>{qrData?.bundle_name || selectedBundle?.name}</Text>
                  </View>

                  <Text style={styles.qrAmountHeadline}>
                    ₱{qrData?.amount_php || selectedBundle?.price_php} <Text style={styles.qrAmountCurrency}>PHP</Text>
                  </Text>
                  <Text style={styles.qrAmountSub}>
                    for {qrData?.coins_amount || selectedBundle?.coins_amount} Gold Coins
                  </Text>

                  {/* QR Image Box */}
                  <View style={styles.qrCodeBox}>
                    {qrData?.qr_image_url ? (
                      <Image
                        source={{ uri: qrData.qr_image_url }}
                        style={styles.qrImageElement}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.qrLoadingBox}>
                        <ActivityIndicator size="large" color={COLORS.teal} />
                        <Text style={styles.qrLoadingText}>Generating QR Ph code...</Text>
                      </View>
                    )}
                  </View>

                  {/* Status Banner */}
                  <View style={styles.qrStatusBanner}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.qrStatusText}>
                      {verifying ? 'Verifying payment...' : 'Scan with GCash, Maya, or any Bank app'}
                    </Text>
                  </View>

                  {/* Instructions */}
                  <View style={styles.qrInstructions}>
                    <Text style={styles.qrInstructionStep}>1. Open GCash, Maya, or any Banking app</Text>
                    <Text style={styles.qrInstructionStep}>2. Tap “Scan QR” and scan or upload screenshot</Text>
                    <Text style={styles.qrInstructionStep}>3. Approve ₱{qrData?.amount_php || selectedBundle?.price_php} payment to LAKBAY</Text>
                  </View>

                  {/* Action Buttons */}
                  <TouchableOpacity
                    style={[styles.qrVerifyBtn, verifying && { opacity: 0.7 }]}
                    onPress={handleManualCheck}
                    disabled={verifying}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.qrVerifyBtnText}>Check Payment Status</Text>
                  </TouchableOpacity>

                  {/* Dev Mode Simulation for Capstone Testing */}
                  <TouchableOpacity
                    style={styles.qrSimulateBtn}
                    onPress={handleSimulateTestPayment}
                    disabled={verifying}
                  >
                    <Ionicons name="flask-outline" size={14} color={COLORS.teal} />
                    <Text style={styles.qrSimulateBtnText}>Simulate Test Payment (Dev Mode)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.qrCancelBtn} onPress={handleCloseQRModal}>
                    <Text style={styles.qrCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </VintaCard>
          </View>
        </Modal>
        {dialog}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOP.sky },
  centerContainer: { justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: FONTS.medium, fontSize: 13, color: SHOP.inkSoft },

  // Header (app navy with the Vinta stripe)
  headerSafe: { backgroundColor: COLORS.navy, zIndex: 2 },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#FFFFFF', letterSpacing: 2, lineHeight: 22 },
  headerSub: { fontFamily: FONTS.semiBold, fontSize: 11, color: 'rgba(191,215,255,0.70)', letterSpacing: 1.5, marginTop: 2, lineHeight: 14 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.40)',
    borderRadius: RADIUS.pill,
    height: 30,
    paddingRight: 12,
    marginLeft: 22,
  },
  balanceCoin: { marginLeft: -14, marginRight: 6 },
  balanceText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold, minWidth: 28 },

  // Content
  content: { flex: 1 },
  grid: { paddingHorizontal: GRID_PAD, paddingTop: 16 },
  gridRow: { justifyContent: 'space-between', marginBottom: 18 },
  listHead: { marginBottom: 16 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: SHOP.ink },
  sectionHint: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17, color: SHOP.inkSoft, marginTop: 3 },
  emptyText: { textAlign: 'center', color: SHOP.inkSoft, marginTop: 40, fontFamily: FONTS.regular },

  // Pack card
  card: { width: CARD_W },
  cardGrad: {
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#0B3550', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 5,
  },
  cardShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 46,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardTitle: {
    fontFamily: GUIDE_FONTS.display,
    fontSize: 14,
    lineHeight: 19,
    minHeight: 38,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  artWrap: {
    width: CARD_W - 16,
    height: CARD_W * 0.82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artRays: {
    position: 'absolute',
    left: (CARD_W - 16 - CARD_W * 1.05) / 2,
    top: (CARD_W * 0.82 - CARD_W * 1.05) / 2,
  },
  packImage: { width: CARD_W * 0.72, height: CARD_W * 0.72 },
  amountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 10,
  },
  amountText: { fontFamily: FONTS.bold, fontSize: 12, color: SHOP.ink },
  priceBtn: {
    width: '86%',
    height: 40,
    borderRadius: 12,
    backgroundColor: SHOP.green,
    borderBottomWidth: 4,
    borderBottomColor: SHOP.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBtnText: {
    fontFamily: GUIDE_FONTS.display, fontSize: 15, color: '#FFFFFF',
    textShadowColor: 'rgba(0,70,20,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  cardCaption: { fontFamily: FONTS.medium, fontSize: 10, marginTop: 7, opacity: 0.8, textAlign: 'center' },

  sticker: {
    position: 'absolute',
    top: -10,
    left: -8,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7C3AED',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-14deg' }],
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 7,
  },
  stickerText: { fontFamily: GUIDE_FONTS.display, fontSize: 9, lineHeight: 11, color: '#FDE047', textAlign: 'center' },
  ribbon: {
    position: 'absolute',
    top: 12,
    left: -34,
    width: 120,
    paddingVertical: 3,
    backgroundColor: '#FDE047',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
  },
  ribbonText: { fontFamily: GUIDE_FONTS.display, fontSize: 8, color: SHOP.ink, letterSpacing: 0.5 },

  // ── QR Ph Modal Styles ──
  qrModalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.50)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  qrModalCard: {
    width: '100%', maxWidth: 380, maxHeight: '90%',
  },
  qrModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  qrModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qrPhIconWrap: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
  },
  qrPhIconText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFFFFF' },
  qrModalHeaderTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B' },
  qrModalHeaderSub: { fontFamily: FONTS.regular, fontSize: 10, color: '#64748B' },
  qrModalCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F1F5F9',
    borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },

  qrModalBody: {
    alignItems: 'center', padding: 20,
  },
  qrBundlePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.30)',
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 8,
  },
  qrBundlePillText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#92400E' },
  qrAmountHeadline: {
    fontFamily: FONTS.bold, fontSize: 28, color: '#1E293B', letterSpacing: 0.5,
  },
  qrAmountCurrency: { fontSize: 14, color: COLORS.accent},
  qrAmountSub: {
    fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2,
  },

  qrCodeBox: {
    width: 220, height: 220, backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 10, marginVertical: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  qrImageElement: {
    width: '100%', height: '100%',
  },
  qrLoadingBox: {
    alignItems: 'center', gap: 8,
  },
  qrLoadingText: {
    fontFamily: FONTS.medium, fontSize: 11, color: '#475569',
  },

  qrStatusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.30)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  qrStatusText: {
    fontFamily: FONTS.medium, fontSize: 11, color: '#92400E',
  },

  qrInstructions: {
    width: '100%', backgroundColor: '#F8FAFC',
    borderRadius: 8, padding: 10, gap: 4, marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  qrInstructionStep: {
    fontFamily: FONTS.regular, fontSize: 11, color: '#475569',
  },

  qrVerifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, width: '100%', padding: 13,
    borderRadius: RADIUS.pill, marginBottom: 8,
  },
  qrVerifyBtnText: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF',
  },

  qrSimulateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.30)',
    width: '100%', padding: 10, borderRadius: RADIUS.pill, marginBottom: 10,
  },
  qrSimulateBtnText: {
    fontFamily: FONTS.medium, fontSize: 11, color: COLORS.teal,
  },

  qrCancelBtn: { padding: 6 },
  qrCancelText: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8' },

  // Success State
  qrSuccessWrap: {
    alignItems: 'center', padding: 24, gap: 10,
  },
  qrSuccessTitle: {
    fontFamily: FONTS.bold, fontSize: 20, color: '#1E293B', marginTop: 4,
  },
  qrSuccessCoins: {
    fontFamily: FONTS.bold, fontSize: 18, color: '#92400E',
  },
  qrSuccessSub: {
    fontFamily: FONTS.regular, fontSize: 12, color: '#64748B',
    textAlign: 'center', lineHeight: 18,
  },
  qrSuccessBtn: {
    backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: RADIUS.pill, marginTop: 10,
  },
  qrSuccessBtnText: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF',
  },
});
