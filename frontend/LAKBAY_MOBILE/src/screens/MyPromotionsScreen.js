import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { getPromotions, publishPromotion, getPublishCost } from '../api/promotionService';

export default function MyPromotionsScreen({ navigation }) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishCost, setPublishCost] = useState(50);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyPromotions();
      fetchCost();
    }, [])
  );

  const fetchCost = async () => {
    const cost = await getPublishCost();
    setPublishCost(cost);
  };

  const fetchMyPromotions = async () => {
    setLoading(true);
    try {
      const data = await getPromotions();
      setPromotions(data);
    } catch (e) {
      console.log('Error fetching promotions', e);
      Alert.alert('Error', 'Failed to load your promotions.');
    } finally {
      setLoading(false);
    }
  };

  const confirmPublish = (promo) => {
    setSelectedPromo(promo);
    setModalVisible(true);
  };

  const executePublish = async () => {
    if (!selectedPromo) return;
    setPublishing(true);
    try {
      await publishPromotion(selectedPromo.id);
      setModalVisible(false);
      Alert.alert("Success", "Your promotion is now live!");
      fetchMyPromotions();
    } catch (e) {
      console.log('Publish error:', e.response?.data);
      setModalVisible(false);
      if (e.response?.status === 402) {
        Alert.alert("Insufficient Coins", `You need ${e.response.data.required} coins to publish.`);
      } else {
        Alert.alert("Error", "Failed to publish promotion.");
      }
    } finally {
      setPublishing(false);
      setSelectedPromo(null);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING_REVIEW': return '#F59E0B';
      case 'APPROVED_PENDING_PAYMENT': return '#10B981';
      case 'PUBLISHED': return '#3B82F6';
      case 'REJECTED': return '#EF4444';
      default: return COLORS.textMuted;
    }
  };

  const renderItem = ({ item }) => {
    const isApproved = item.status === 'APPROVED_PENDING_PAYMENT';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.spotName}>{item.spot_name}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        
        {item.rejection_reason ? (
          <Text style={styles.rejectionText}>Reason: {item.rejection_reason}</Text>
        ) : null}

        {isApproved && (
          <TouchableOpacity 
            style={styles.publishBtn} 
            onPress={() => confirmPublish(item)}
            disabled={publishing}
          >
            <Text style={styles.publishBtnText}>Pay & Publish</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Promotions</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : promotions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="megaphone-outline" size={60} color={COLORS.textSub} />
          <Text style={styles.emptyText}>You haven't submitted any promotions yet.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('Promote')}>
            <Text style={styles.createBtnText}>Create One Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Custom Payment Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { if (!publishing) setModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="logo-bitcoin" size={40} color={COLORS.gold} />
            </View>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <Text style={styles.modalBody}>
              Publishing <Text style={{fontFamily: FONTS.bold}}>{selectedPromo?.spot_name}</Text> will cost you <Text style={{color: COLORS.gold, fontFamily: FONTS.bold}}>{publishCost} Coins</Text>.
            </Text>
            <Text style={styles.modalSubBody}>
              Once paid, your promotion will instantly become visible to all users exploring the map.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalBtnCancel} 
                onPress={() => setModalVisible(false)}
                disabled={publishing}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalBtnConfirm} 
                onPress={executePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Pay {publishCost} Coins</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  listContent: { padding: 16 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  spotName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#fff',
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSub,
    lineHeight: 20,
  },
  rejectionText: {
    marginTop: 8,
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#EF4444',
  },
  publishBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: 16,
  },
  publishBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSub,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  createBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  createBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.goldGlow,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 12,
  },
  modalBody: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubBody: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSub,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgSurface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnCancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.bg,
  },
});
