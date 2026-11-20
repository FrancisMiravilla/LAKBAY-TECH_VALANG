import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { getCharacterDetails } from '../constants/characters';
import { Stars } from './StarRating';
import RatingModal from './RatingModal';
import { getReviews } from '../api/reviewService';

const PREVIEW_COUNT = 3;

const timeAgo = (iso) => {
  const then = new Date(iso).getTime();
  if (!then) return '';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
};

function ReviewRow({ review }) {
  const portrait = getCharacterDetails(review.character);
  return (
    <View style={styles.review}>
      <Image source={portrait.image} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <View style={styles.reviewHead}>
          <Text style={styles.reviewName} numberOfLines={1}>{review.name}</Text>
          <Text style={styles.reviewDate}>{timeAgo(review.updated_at)}</Text>
        </View>
        <Stars value={review.rating} size={13} />
        {!!review.comment && <Text style={styles.reviewText}>{review.comment}</Text>}
      </View>
    </View>
  );
}

/**
 * Ratings and comments for a spot or promotion.
 * allowWrite: show a "Rate" button even before the player has rated (promotions).
 * Spots are first rated after their quest, so there only an existing rating can be edited.
 */
export default function ReviewsSection({ kind = 'spot', targetId, title, allowWrite = false, onSummary }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(false);

  const load = useCallback(() => {
    if (targetId == null) return;
    setLoading(true);
    setFailed(false);
    getReviews(kind, targetId)
      .then((s) => { setSummary(s); onSummary?.(s); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [kind, targetId, onSummary]);

  useEffect(() => { load(); }, [load]);

  const mine = summary?.my_review;
  const canRate = allowWrite || !!mine;
  const results = summary?.results || [];
  const shown = expanded ? results : results.slice(0, PREVIEW_COUNT);

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.title}>Ratings &amp; Reviews</Text>
        {canRate && !loading && (
          <TouchableOpacity style={styles.rateBtn} onPress={() => setRating(true)} activeOpacity={0.85}>
            <Ionicons name={mine ? 'create-outline' : 'star-outline'} size={14} color={COLORS.accent} />
            <Text style={styles.rateBtnText}>{mine ? 'Edit your rating' : 'Rate'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 12 }} />
      ) : failed ? (
        <TouchableOpacity onPress={load}>
          <Text style={styles.muted}>Couldn&apos;t load reviews. Tap to try again.</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.avg}>{summary?.average != null ? Number(summary.average).toFixed(1) : '–'}</Text>
            <View>
              <Stars value={summary?.average || 0} size={16} />
              <Text style={styles.muted}>
                {summary?.count ? `${summary.count} rating${summary.count === 1 ? '' : 's'}` : 'No ratings yet'}
              </Text>
            </View>
          </View>

          {results.length === 0 ? (
            <Text style={styles.muted}>
              {kind === 'spot'
                ? 'Be the first to rate this spot after finishing its quest.'
                : 'Be the first to share your experience.'}
            </Text>
          ) : (
            shown.map((r) => <ReviewRow key={r.id} review={r} />)
          )}

          {results.length > PREVIEW_COUNT && (
            <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={8}>
              <Text style={styles.more}>{expanded ? 'Show less' : `Show all ${results.length} reviews`}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <RatingModal
        visible={rating}
        kind={kind}
        targetId={targetId}
        title={title}
        initial={mine}
        onClose={() => setRating(false)}
        onSaved={(s) => { setSummary(s); onSummary?.(s); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.navy },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: COLORS.accentBorder, backgroundColor: COLORS.accentSoft,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  rateBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.accent },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avg: { fontFamily: FONTS.bold, fontSize: 34, color: COLORS.navy },
  muted: { fontFamily: FONTS.medium, fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
  review: {
    flexDirection: 'row', gap: 10, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 2 },
  reviewName: { flex: 1, fontFamily: FONTS.bold, fontSize: 13.5, color: COLORS.navy },
  reviewDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textFaint },
  reviewText: { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 19, color: COLORS.textSub, marginTop: 4 },
  more: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.accent, marginTop: 8 },
});
