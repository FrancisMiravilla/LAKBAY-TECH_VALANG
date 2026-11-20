import React, { useEffect, useState } from 'react';
import {
  Modal, StyleSheet, View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Keyboard, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import VintaCard from './VintaCard';
import VintaStripe from './VintaStripe';
import { StarPicker, RATING_LABELS } from './StarRating';
import { submitReview, reviewErrorText } from '../api/reviewService';

const GUIDE_IMAGE = require('../assets/guide_character.png');
const MAX_COMMENT = 500;

/**
 * Star rating (1-5) + optional comment for a tourist spot or a promotion.
 * kind: 'spot' | 'promotion'; initial: the player's existing review, if any.
 * onSaved(summary) receives the server's updated {average, count, my_review, results}.
 */
export default function RatingModal({ visible, kind = 'spot', targetId, title, initial, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setRating(initial?.rating || 0);
    setComment(initial?.comment || '');
    setError('');
  }, [visible, initial]);

  // Lift the card above the keyboard ourselves. KeyboardAvoidingView inside a
  // Modal mis-measures on edge-to-edge Android and could shrink the card away.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (!visible) return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); setKeyboardHeight(0); };
  }, [visible]);

  const save = async () => {
    if (!rating || saving) return;
    setSaving(true);
    setError('');
    try {
      const summary = await submitReview(kind, targetId, rating, comment.trim());
      onSaved?.(summary);
      onClose?.();
    } catch (e) {
      setError(reviewErrorText(e));
    } finally {
      setSaving(false);
    }
  };

  const heading = kind === 'promotion' ? `Rate ${title || 'this place'}` : `How was ${title || 'this spot'}?`;
  const sub = kind === 'promotion'
    ? 'Share your experience to help other explorers.'
    : 'You finished the quest! Rate the spot and tell other explorers what you thought.';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingBottom: keyboardHeight }]}>
        <VintaCard style={styles.cardFrame} contentStyle={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={COLORS.textSub} />
          </TouchableOpacity>

          <View style={styles.guideCircle}>
            <Image source={GUIDE_IMAGE} style={styles.guide} resizeMode="contain" />
          </View>

          <Text style={styles.title} numberOfLines={2}>{heading}</Text>
          <View style={styles.stripe}><VintaStripe height={3} /></View>
          <Text style={styles.subtitle}>{sub}</Text>

          <StarPicker value={rating} onChange={setRating} />
          <Text style={styles.ratingLabel}>{rating ? RATING_LABELS[rating] : 'Tap a star to rate'}</Text>

          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment (optional)"
            placeholderTextColor={COLORS.textFaint}
            multiline
            maxLength={MAX_COMMENT}
          />
          <Text style={styles.counter}>{comment.length}/{MAX_COMMENT}</Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, (!rating || saving) && styles.submitBtnOff]}
            onPress={save}
            disabled={!rating || saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
              <>
                <Ionicons name="star" size={17} color="#FFF" />
                <Text style={styles.submitText}>{initial ? 'Update Rating' : 'Submit Rating'}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.laterBtn}>
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </VintaCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.70)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  cardFrame: { width: '100%', maxWidth: 360 },
  card: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 16, alignItems: 'center' },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, zIndex: 10,
  },
  guideCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFBEB',
    borderWidth: 2, borderColor: 'rgba(251, 191, 36, 0.7)',
    alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 12,
  },
  guide: { width: 70, height: 70 },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.navy, textAlign: 'center', paddingHorizontal: 18 },
  stripe: { width: '70%', marginVertical: 8 },
  subtitle: {
    fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSub,
    textAlign: 'center', lineHeight: 19, marginBottom: 14,
  },
  ratingLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted, marginTop: 6, marginBottom: 12 },
  input: {
    width: '100%', minHeight: 84, maxHeight: 140,
    backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, padding: 12,
    color: COLORS.text, fontFamily: FONTS.regular, fontSize: 13, textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textFaint, marginTop: 4 },
  error: { fontFamily: FONTS.medium, fontSize: 12, color: '#B91C1C', textAlign: 'center', marginTop: 6 },
  submitBtn: {
    width: '100%', height: 48, borderRadius: RADIUS.md, marginTop: 12,
    backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderBottomWidth: 3, borderBottomColor: COLORS.accentDark,
  },
  submitBtnOff: { opacity: 0.5 },
  submitText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF', letterSpacing: 0.5 },
  laterBtn: { paddingVertical: 10 },
  laterText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted },
});
