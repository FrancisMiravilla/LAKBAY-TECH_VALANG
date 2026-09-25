import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Dimensions, ImageBackground, StatusBar,
  Modal, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import {
  getWallet,
  getBundles,
  createBundleQRPh,
  verifyBundlePayment,
  simulateTestBundlePayment,
} from '../api/promotionService';
import { ORIGIN } from '../api/qrService';
import VintaStripe from '../components/VintaStripe';

const { width } = Dimensions.get('window');

const COIN_IMAGE = 'https://cdn-icons-png.flaticon.com/512/2850/2850730.png';

const formatImageUrl = (img) => {
  if (!img) return COIN_IMAGE;
  if (img.startsWith('http://localhost:8000') || img.startsWith('http://127.0.0.1:8000')) {
    return img.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, ORIGIN);
  }
  if (img.startsWith('/media')) return `${ORIGIN}${img}`;
  return img;
};

export default function StoreScreen({ navigation }) {
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
      Alert.alert('Payment Error', 'Failed to generate QR Ph code. Please check server connection.');
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
        Alert.alert('Payment Pending', 'Payment confirmation has not yet arrived from PayMongo. Please scan the QR Ph code and approve payment.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to verify payment with server.');
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
      Alert.alert('Error', 'Failed to simulate test payment.');
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

  if (loading) {
    return (
      <ImageBackground
        source={require('../../reference/VINTA.jpeg')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.bgOverlay} />
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Opening Lakbay Vault…</Text>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  const renderBundleCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={() => handleBuy(item)}
      disabled={buying || qrLoading}
      activeOpacity={0.82}
    >
      <ImageBackground 
        source={{ uri: formatImageUrl(item.image) }} 
        style={styles.bundleBgImage} 
        resizeMode="cover"
      >
        <View style={styles.cardOverlay}>
          {/* Top Row: Coin badge + Price Tag */}
          <View style={styles.cardTopRow}>
            <View style={styles.coinBadgeMini}>
              <Ionicons name="sparkles" size={10} color={COLORS.gold} />
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>₱{item.price_php}</Text>
            </View>
          </View>

          {/* Center: Coin Amount */}
          <View style={styles.centerContent}>
            <Image source={{ uri: COIN_IMAGE }} style={{ width: 34, height: 34, tintColor: COLORS.gold }} />
            <Text style={styles.coinsTextCenter}>{item.coins_amount}</Text>
          </View>

          {/* Bottom: Name & Action */}
          <View style={styles.bottomContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.buyBtnPill}>
              <Text style={styles.buyBtnText}>BUY QR PH →</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

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
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>LAKBAY STORE</Text>
            <Text style={styles.headerSub}>EXPEDITION COIN VAULT</Text>
          </View>
        </View>
        <VintaStripe height={3} />

        <FlatList
          key="2col"
          data={bundles}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={renderBundleCard}
          ListHeaderComponent={
            <View style={styles.walletCard}>
              <View style={styles.walletGlowOrb} />
              <View style={styles.walletHeaderRow}>
                <View style={styles.vaultPill}>
                  <Ionicons name="wallet-outline" size={12} color={COLORS.gold} />
                  <Text style={styles.vaultPillText}>TREASURY BALANCE</Text>
                </View>
                <TouchableOpacity onPress={fetchData} activeOpacity={0.7} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={14} color="rgba(191,215,255,0.7)" />
                </TouchableOpacity>
              </View>

              <View style={styles.walletRow}>
                <Image source={{ uri: COIN_IMAGE }} style={{ width: 32, height: 32, tintColor: COLORS.gold }} />
                <Text style={styles.walletBalance}>{wallet?.balance || 0}</Text>
                <Text style={styles.walletCoinsLabel}>COINS</Text>
              </View>

              <Text style={styles.walletHint}>
                Coins are required to promote landmark spots on the map, unlock cosmetics, and access exclusive travel quests.
              </Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No treasure bundles available right now.</Text>}
        />

        {/* ── QR Ph Payment Modal for Coin Bundle ── */}
        <Modal
          visible={qrModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseQRModal}
        >
          <View style={styles.qrModalBackdrop}>
            <View style={styles.qrModalCard}>
              <VintaStripe height={4} />

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
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {paymentStatus === 'paid' ? (
                /* Success State */
                <View style={styles.qrSuccessWrap}>
                  <Ionicons name="checkmark-circle" size={64} color={COLORS.teal} />
                  <Text style={styles.qrSuccessTitle}>Payment Received! 🎉</Text>
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
                    <Text style={styles.qrInstructionStep}>2. Tap 'Scan QR' and scan or upload screenshot</Text>
                    <Text style={styles.qrInstructionStep}>3. Approve ₱{qrData?.amount_php || selectedBundle?.price_php} payment to LAKBAY</Text>
                  </View>

                  {/* Action Buttons */}
                  <TouchableOpacity
                    style={[styles.qrVerifyBtn, verifying && { opacity: 0.7 }]}
                    onPress={handleManualCheck}
                    disabled={verifying}
                  >
                    <Ionicons name="refresh" size={16} color="#08143C" />
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
    backgroundColor: 'rgba(4, 10, 38, 0.85)',
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(191,215,255,0.85)' },

  header: {
    paddingVertical: 16,
    backgroundColor: 'rgba(8, 20, 60, 0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 179, 237, 0.20)',
    alignItems: 'center',
  },
  headerTitle: { fontFamily: FONTS.pixel, fontSize: 11, color: '#FFFFFF', letterSpacing: 2, lineHeight: 18 },
  headerSub: { fontFamily: FONTS.medium, fontSize: 9, color: 'rgba(191,215,255,0.70)', letterSpacing: 1.5, marginTop: 1 },
  
  // Wallet Vault Card
  walletCard: {
    padding: 20,
    backgroundColor: 'rgba(8, 20, 60, 0.65)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW.accent,
  },
  walletGlowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  walletHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  vaultPillText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 1.5,
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  walletBalance: {
    fontFamily: FONTS.pixel,
    fontSize: 22,
    color: COLORS.gold,
    letterSpacing: 1,
    textShadowColor: 'rgba(251,191,36,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  walletCoinsLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: 'rgba(191,215,255,0.85)',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  walletHint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(191,215,255,0.70)',
    lineHeight: 16,
  },
  
  list: { padding: 16, paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 14 },
  
  // Bundle card
  cardContainer: {
    width: (width - 44) / 2,
    height: 180,
    backgroundColor: 'rgba(8, 20, 60, 0.65)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 179, 237, 0.25)',
    overflow: 'hidden',
    ...SHADOW.accent,
  },
  bundleBgImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,10,38,0.72)',
    padding: 12,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinBadgeMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceTag: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  priceText: {
    fontFamily: FONTS.bold, fontSize: 11, color: '#08143C',
  },
  centerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coinsTextCenter: {
    fontFamily: FONTS.bold, fontSize: 24, color: COLORS.gold,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  bottomContent: {
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontFamily: FONTS.semiBold, fontSize: 12, color: '#FFFFFF', textAlign: 'center',
  },
  buyBtnPill: {
    backgroundColor: 'rgba(26, 86, 219, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.40)',
    borderRadius: RADIUS.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  buyBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  emptyText: { textAlign: 'center', color: 'rgba(191,215,255,0.6)', marginTop: 40, fontFamily: FONTS.regular },

  // ── QR Ph Modal Styles ──
  qrModalBackdrop: {
    flex: 1, backgroundColor: 'rgba(3, 7, 24, 0.92)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  qrModalCard: {
    width: '100%', maxWidth: 380, maxHeight: '90%',
    backgroundColor: '#09153B',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: 'rgba(99, 179, 237, 0.35)',
    overflow: 'hidden', ...SHADOW.card,
  },
  qrModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(99, 179, 237, 0.15)',
    backgroundColor: 'rgba(6, 14, 44, 0.80)',
  },
  qrModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qrPhIconWrap: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
  },
  qrPhIconText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFFFFF' },
  qrModalHeaderTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF' },
  qrModalHeaderSub: { fontFamily: FONTS.regular, fontSize: 10, color: 'rgba(191,215,255,0.70)' },
  qrModalCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  qrModalBody: {
    alignItems: 'center', padding: 20,
  },
  qrBundlePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 8,
  },
  qrBundlePillText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.gold },
  qrAmountHeadline: {
    fontFamily: FONTS.bold, fontSize: 28, color: '#FFFFFF', letterSpacing: 0.5,
  },
  qrAmountCurrency: { fontSize: 14, color: COLORS.teal },
  qrAmountSub: {
    fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(191,215,255,0.75)', marginTop: 2,
  },

  qrCodeBox: {
    width: 220, height: 220, backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 10, marginVertical: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#38BDF8', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  qrImageElement: {
    width: '100%', height: '100%',
  },
  qrLoadingBox: {
    alignItems: 'center', gap: 8,
  },
  qrLoadingText: {
    fontFamily: FONTS.medium, fontSize: 11, color: '#08143C',
  },

  qrStatusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.40)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  qrStatusText: {
    fontFamily: FONTS.medium, fontSize: 11, color: COLORS.gold,
  },

  qrInstructions: {
    width: '100%', backgroundColor: 'rgba(8, 20, 60, 0.60)',
    borderRadius: 8, padding: 10, gap: 4, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(99, 179, 237, 0.15)',
  },
  qrInstructionStep: {
    fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(191,215,255,0.75)',
  },

  qrVerifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.teal, width: '100%', padding: 13,
    borderRadius: RADIUS.pill, marginBottom: 8,
  },
  qrVerifyBtnText: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#08143C',
  },

  qrSimulateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.40)',
    width: '100%', padding: 10, borderRadius: RADIUS.pill, marginBottom: 10,
  },
  qrSimulateBtnText: {
    fontFamily: FONTS.medium, fontSize: 11, color: COLORS.teal,
  },

  qrCancelBtn: { padding: 6 },
  qrCancelText: { fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(191,215,255,0.50)' },

  // Success State
  qrSuccessWrap: {
    alignItems: 'center', padding: 24, gap: 10,
  },
  qrSuccessTitle: {
    fontFamily: FONTS.bold, fontSize: 20, color: '#FFFFFF', marginTop: 4,
  },
  qrSuccessCoins: {
    fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gold,
  },
  qrSuccessSub: {
    fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(191,215,255,0.80)',
    textAlign: 'center', lineHeight: 18,
  },
  qrSuccessBtn: {
    backgroundColor: COLORS.teal, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: RADIUS.pill, marginTop: 10,
  },
  qrSuccessBtnText: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#08143C',
  },
});
