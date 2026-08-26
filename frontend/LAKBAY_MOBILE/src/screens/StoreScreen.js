import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking, Image, Dimensions, ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { getWallet, getBundles, createCheckout } from '../api/promotionService';
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

  const handleBuy = async (bundleId) => {
    setBuying(true);
    try {
      const { checkout_url } = await createCheckout(bundleId);
      Linking.openURL(checkout_url);
    } catch (e) {
      console.log('Error creating checkout', e);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setBuying(false);
    }
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
      onPress={() => handleBuy(item.id)}
      disabled={buying}
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
              <Text style={styles.buyBtnText}>ACQUIRE →</Text>
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
                Coins are used to promote landmark spots, unlock custom cosmetics, and access exclusive travel quests.
              </Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No treasure bundles available right now.</Text>}
        />
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
});
