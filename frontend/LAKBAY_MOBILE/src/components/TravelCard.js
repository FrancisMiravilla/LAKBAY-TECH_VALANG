import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING, SIZES } from '../constants/theme';

export default function TravelCard({
  title,
  location,
  imageUri,
  rating,
  price,
  category,
  onPress
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🌴</Text>
            <Text style={styles.placeholderText}>Lakbay Vista</Text>
          </View>
        )}
        {/* Rating badge */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>⭐ {rating || '4.8'}</Text>
        </View>
        {/* Category label */}
        {category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        )}
        {/* Bottom gradient simulation */}
        <View style={styles.imageOverlay} />
      </View>

      <View style={styles.content}>
        <Text style={styles.locationText}>📍 {location || 'Philippines'}</Text>
        <Text style={styles.titleText}>{title || 'Scenic Destination'}</Text>

        <View style={styles.footer}>
          {price ? (
            <Text style={styles.priceText}>
              <Text style={styles.priceLabel}>From </Text>
              {price === 'Free' ? '🆓 Free' : `₱${price}`}
            </Text>
          ) : <View />}
          <View style={styles.exploreBtn}>
            <Text style={styles.exploreText}>Explore →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    backgroundColor: COLORS.bgSurface,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderEmoji: { fontSize: 38 },
  placeholderText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.accent,
    fontSize: SIZES.fontRegular,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 60,
    backgroundColor: COLORS.bgCard,
    opacity: 0.5,
  },
  ratingBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(13,5,32,0.82)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  ratingText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.fontSm,
    color: COLORS.text,
  },
  categoryBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  categoryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  content: {
    padding: SPACING.md,
  },
  locationText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.fontSm,
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.fontRegular,
    color: COLORS.gold,
  },
  priceLabel: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
  },
  exploreBtn: {
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  exploreText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.fontSm,
    color: COLORS.accent,
  },
});
