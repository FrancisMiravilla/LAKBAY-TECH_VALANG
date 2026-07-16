import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';
import { getWallet, getBundles, createCheckout } from '../api/promotionService';

const { width } = Dimensions.get('window');

// A placeholder 2D image for the coin bundles since we don't have image fields in the database yet
const COIN_IMAGE = 'https://cdn-icons-png.flaticon.com/512/2850/2850730.png';

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
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>
      
      <View style={styles.imageContainer}>
        {/* Here is where the 2D Image goes! */}
        <Image source={{ uri: COIN_IMAGE }} style={styles.bundleImage} resizeMode="contain" />
      </View>
      
      <View style={styles.coinsRow}>
        <Ionicons name="diamond" size={16} color={COLORS.gold} />
        <Text style={styles.coinsText}>{item.coins_amount}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.buyBtn, buying && { opacity: 0.7 }]} 
        onPress={() => handleBuy(item.id)}
        disabled={buying}
      >
        <Text style={styles.buyBtnText}>₱{item.price_php}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lakbay Store</Text>
      </View>

      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>Your Balance</Text>
        <View style={styles.walletRow}>
          <Ionicons name="diamond" size={24} color={COLORS.gold} />
          <Text style={styles.walletBalance}>{wallet?.balance || 0} Coins</Text>
        </View>
      </View>

      <FlatList
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
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text, textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bundleImage: {
    width: 60,
    height: 60,
  },
  coinsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12,
    backgroundColor: 'rgba(251,191,36,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill
  },
  coinsText: {
    fontFamily: FONTS.bold, fontSize: 16, color: COLORS.gold,
  },
  buyBtn: {
    width: '100%',
    backgroundColor: COLORS.teal,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  buyBtnText: {
    fontFamily: FONTS.bold, fontSize: 14, color: '#FFF',
  },
  emptyText: { textAlign: 'center', color: COLORS.textSub, marginTop: 40, fontFamily: FONTS.regular },
});
