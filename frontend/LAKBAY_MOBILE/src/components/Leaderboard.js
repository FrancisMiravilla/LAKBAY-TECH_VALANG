import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, GOLD_TEXT } from '../constants/theme';
import VintaCard from './VintaCard';
import LucideIcon from './LucideIcon';
import DecoratedAvatar from './DecoratedAvatar';
import { authService } from '../api/authService';
import { getCharacterDetails } from '../constants/characters';

const MEDALS = {
  1: { color: '#F4B400', label: '1st' },
  2: { color: '#A8B3C2', label: '2nd' },
  3: { color: '#CD7F32', label: '3rd' },
};

// Players who equipped decorations show them; others keep the plain medal/accent ring.
function Avatar({ player, size, ringColor }) {
  if (player.hat || player.frame || player.pin) {
    return (
      <DecoratedAvatar
        character={player.chosen_character}
        size={size}
        hat={player.hat}
        frame={player.frame}
        pin={player.pin}
      />
    );
  }
  const details = getCharacterDetails(player.chosen_character);
  return (
    <View style={[styles.avatarRing, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, borderColor: ringColor }]}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: COLORS.bg }}>
        <Image
          source={details.image}
          style={{ width: '100%', height: '100%', transform: [{ scale: details.zoom || 1 }] }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

function PodiumSpot({ player, place }) {
  const medal = MEDALS[place];
  const first = place === 1;
  if (!player) return <View style={styles.podiumCol} />;
  return (
    <View style={[styles.podiumCol, first && styles.podiumColFirst]}>
      {first && <LucideIcon name="crown" size={24} color="#F4B400" style={styles.crown} />}
      <Avatar player={player} size={first ? 74 : 58} ringColor={medal.color} />
      <View style={[styles.medalChip, { backgroundColor: medal.color }]}>
        <Text style={styles.medalChipText}>{player.rank}</Text>
      </View>
      <Text style={[styles.podiumName, player.is_me && styles.meText]} numberOfLines={1}>
        {player.in_game_name}
      </Text>
      <Text style={styles.podiumChar} numberOfLines={1}>{getCharacterDetails(player.chosen_character).name}</Text>
      <Text style={styles.podiumXp}>{player.xp.toLocaleString()} XP</Text>
      <View style={[styles.podiumBase, { height: first ? 46 : place === 2 ? 32 : 22, backgroundColor: medal.color + '33', borderColor: medal.color }]} />
    </View>
  );
}

function PlayerRow({ player, last }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }, player.is_me && styles.rowMe]}>
      <Text style={styles.rowRank}>{player.rank}</Text>
      <Avatar player={player} size={38} ringColor={player.is_me ? COLORS.accent : COLORS.border} />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, player.is_me && styles.meText]} numberOfLines={1}>
          {player.in_game_name}{player.is_me ? '  (You)' : ''}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {getCharacterDetails(player.chosen_character).name} · Lv {player.level}
        </Text>
      </View>
      <Text style={styles.rowXp}>{player.xp.toLocaleString()} XP</Text>
    </View>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await authService.getLeaderboard(50));
    } catch (_) {
      setError('Could not load the leaderboard. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <VintaCard contentStyle={styles.messageCard}>
        <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textMuted} />
        <Text style={styles.messageText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </VintaCard>
    );
  }

  const results = data?.results || [];
  const me = data?.me;
  const top3 = [results[0], results[1], results[2]];
  const rest = results.slice(3);
  const meListed = results.some((r) => r.is_me);

  return (
    <View>
      {me && (
        <VintaCard style={styles.cardGap} contentStyle={styles.meCard}>
          <Text style={styles.meLabel}>YOUR RANK</Text>
          <View style={styles.meRow}>
            <Text style={styles.meRank}>#{me.rank}</Text>
            <Avatar player={me} size={44} ringColor={COLORS.accent} />
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>{me.in_game_name}</Text>
              <Text style={styles.rowSub}>of {data.total_players} explorers · Lv {me.level}</Text>
            </View>
            <Text style={[styles.rowXp, { color: GOLD_TEXT }]}>{me.xp.toLocaleString()} XP</Text>
          </View>
        </VintaCard>
      )}

      {results.length === 0 ? (
        <VintaCard contentStyle={styles.messageCard}>
          <Text style={styles.messageText}>No explorers yet. Be the first to earn XP!</Text>
        </VintaCard>
      ) : (
        <>
          <VintaCard style={styles.cardGap} contentStyle={styles.podiumCard}>
            <View style={styles.podiumHeader}>
              <Text style={styles.cardTitle}>Top Explorers</Text>
              <TouchableOpacity onPress={load} disabled={loading} hitSlop={10} accessibilityLabel="Refresh leaderboard">
                {loading ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Ionicons name="refresh" size={18} color={COLORS.accent} />}
              </TouchableOpacity>
            </View>
            <View style={styles.podium}>
              <PodiumSpot player={top3[1]} place={2} />
              <PodiumSpot player={top3[0]} place={1} />
              <PodiumSpot player={top3[2]} place={3} />
            </View>
          </VintaCard>

          {rest.length > 0 && (
            <VintaCard contentStyle={styles.listCard}>
              {rest.map((p, i) => (
                <PlayerRow key={p.id} player={p} last={i === rest.length - 1} />
              ))}
            </VintaCard>
          )}

          {me && !meListed && (
            <Text style={styles.footNote}>Keep exploring to climb into the top {results.length}!</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 40, alignItems: 'center' },
  cardGap: { marginBottom: 14 },

  messageCard: { alignItems: 'center', padding: 20, gap: 10 },
  messageText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSub, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8 },
  retryText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF' },

  meCard: { paddingHorizontal: 14, paddingVertical: 12 },
  meLabel: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1.2, color: COLORS.textMuted, marginBottom: 6 },
  meRow: { flexDirection: 'row', alignItems: 'center' },
  meRank: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.navy, minWidth: 48 },
  meText: { color: COLORS.accent },

  podiumCard: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 0 },
  podiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, marginBottom: 6 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.navy },
  podium: { flexDirection: 'row', alignItems: 'flex-end' },
  podiumCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  podiumColFirst: { marginBottom: 0 },
  crown: { marginBottom: 2 },
  avatarRing: { borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  medalChip: {
    marginTop: -12, minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF',
  },
  medalChipText: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },
  podiumName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.navy, marginTop: 4, maxWidth: '100%' },
  podiumChar: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  podiumXp: { fontFamily: FONTS.bold, fontSize: 13, color: GOLD_TEXT, marginBottom: 6 },
  podiumBase: { alignSelf: 'stretch', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderBottomWidth: 0 },

  listCard: { paddingHorizontal: 12, paddingVertical: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowMe: { backgroundColor: 'rgba(26,86,219,0.08)', borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 6 },
  rowRank: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textSub, width: 34, textAlign: 'center' },
  rowText: { flex: 1, marginLeft: 10 },
  rowName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.navy },
  rowSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  rowXp: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.navy, marginLeft: 8 },

  footNote: { fontFamily: FONTS.medium, fontSize: 13, color: '#FFFFFF', textAlign: 'center', marginTop: 12 },
});
