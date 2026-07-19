import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, Image, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { getWallet, getBundles, createCheckout } from '../api/promotionService';
import { ORIGIN } from '../api/qrService';

const { width } = Dimensions.get('window');

// A placeholder 2D image for the coin bundles since we don't have image fields in the database yet
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
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </SafeAreaView>
    );
  }

  const renderBundleCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={() => handleBuy(item.id)}
      disabled={buying}
      activeOpacity={0.8}
    >
      <ImageBackground 
        source={{ uri: formatImageUrl(item.image) }} 
        style={styles.bundleBgImage} 
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Top Right: Price */}
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>₱{item.price_php}</Text>
          </View>

          {/* Center: Coin Amount */}
          <View style={styles.centerContent}>
            <Image source={{ uri: COIN_IMAGE }} style={{ width: 32, height: 32, tintColor: COLORS.gold }} />
            <Text style={styles.coinsTextCenter}>{item.coins_amount}</Text>
          </View>

          {/* Bottom: Name */}
          <View style={styles.bottomContent}>
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lakbay Store</Text>
      </View>

      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>Your Balance</Text>
        <View style={styles.walletRow}>
          <Image source={{ uri: COIN_IMAGE }} style={{ width: 28, height: 28, tintColor: COLORS.gold }} />
          <Text style={styles.walletBalance}>{wallet?.balance || 0} Coins</Text>
        </View>
      </View>

      <FlatList
        key="2col"
        data={bundles}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderBundleCard}
        ListEmptyComponent={<Text style={styles.emptyText}>No bundles available right now.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    alignItems: 'center', backgroundColor: COLORS.bgCard
  },
  headerTitle: { fontFamily: FONTS.pixel, fontSize: 16, color: COLORS.text, letterSpacing: 1 },
  
  walletCard: {
    margin: 16, padding: 20,
    backgroundColor: COLORS.navy, borderRadius: RADIUS.lg,
    alignItems: 'center',
    shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  walletTitle: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletBalance: { fontFamily: FONTS.pixel, fontSize: 24, color: COLORS.gold },
  
  list: { padding: 16, paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
  
  cardContainer: {
    width: (width - 48) / 2, // 2 columns with 16 padding on edges and between
    height: 160,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  bundleBgImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 10,
    justifyContent: 'space-between',
  },
  priceTag: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.teal,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  priceText: {
    fontFamily: FONTS.bold, fontSize: 13, color: '#FFF',
  },
  centerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coinsTextCenter: {
    fontFamily: FONTS.bold, fontSize: 26, color: COLORS.gold,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  bottomContent: {
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#FFF', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
  },
  emptyText: { textAlign: 'center', color: COLORS.textSub, marginTop: 40, fontFamily: FONTS.regular },
});
