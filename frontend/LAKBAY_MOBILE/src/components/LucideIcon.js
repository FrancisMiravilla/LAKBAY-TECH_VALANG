import React from 'react';
import {
  Amphora, Anchor, Award, Bell, Box, Brain, Camera, Check, CircleHelp, Compass, Crown,
  Dices, DoorOpen, Fish, Flame, Gamepad2, Gem, Globe, GraduationCap, HeartCrack, Landmark,
  Lightbulb, Lock, Map as MapIcon, MapPin, Medal, Megaphone, Palette, PartyPopper, Pencil,
  Puzzle, Rocket, Sailboat, Scroll, Search, Shield, Sparkle, Sparkles, Star, Swords, Target,
  TreePalm, Trophy, Zap,
} from 'lucide-react-native';

// App-wide icon set (Lucide). Icons are referenced by key so they can live in
// plain data (rank tables, notifications saved on the device).
export const ICONS = {
  amphora: Amphora,
  anchor: Anchor,
  award: Award,
  bell: Bell,
  box: Box,
  brain: Brain,
  camera: Camera,
  check: Check,
  help: CircleHelp,
  compass: Compass,
  crown: Crown,
  dices: Dices,
  door: DoorOpen,
  fish: Fish,
  flame: Flame,
  gamepad: Gamepad2,
  gem: Gem,
  globe: Globe,
  graduation: GraduationCap,
  heartCrack: HeartCrack,
  landmark: Landmark,
  lightbulb: Lightbulb,
  lock: Lock,
  map: MapIcon,
  pin: MapPin,
  medal: Medal,
  megaphone: Megaphone,
  palette: Palette,
  party: PartyPopper,
  pencil: Pencil,
  puzzle: Puzzle,
  rocket: Rocket,
  sailboat: Sailboat,
  scroll: Scroll,
  search: Search,
  shield: Shield,
  sparkle: Sparkle,
  sparkles: Sparkles,
  star: Star,
  swords: Swords,
  target: Target,
  palm: TreePalm,
  trophy: Trophy,
  zap: Zap,
};

// Emoji that older app versions saved on the device, or that admins typed into the
// CMS (e.g. CulturalIcon.emoji), still render as Lucide icons.
const EMOJI_KEYS = {
  '🏆': 'trophy', '🗺': 'map', '🏛': 'landmark', '🎉': 'party', '✦': 'sparkle', '🔍': 'search',
  '📷': 'camera', '📸': 'camera', '👑': 'crown', '⚡': 'zap', '📍': 'pin', '⚔': 'swords',
  '🎨': 'palette', '🏺': 'amphora', '💡': 'lightbulb', '✨': 'sparkles', '🛡': 'shield',
  '⛵': 'sailboat', '🧭': 'compass', '🎯': 'target', '🏅': 'medal', '⚓': 'anchor', '🔒': 'lock',
  '🧊': 'box', '🧩': 'puzzle', '🎲': 'dices', '🔥': 'flame', '🌐': 'globe', '✏': 'pencil',
  '📢': 'megaphone', '📣': 'megaphone', '🔔': 'bell', '❓': 'help', '🚪': 'door', '🎖': 'award',
  '✓': 'check', '🐟': 'fish', '🐠': 'fish', '🧠': 'brain', '🎓': 'graduation', '🐉': 'gem',
  '🎮': 'gamepad', '🌟': 'star', '⭐': 'star', '💔': 'heartCrack', '📜': 'scroll', '🚀': 'rocket',
  '🌴': 'palm', '💎': 'gem',
};

export function iconKeyFor(nameOrEmoji, fallback = 'sparkles') {
  if (!nameOrEmoji) return fallback;
  const raw = String(nameOrEmoji).trim();
  if (ICONS[raw]) return raw;
  const bare = raw.replace(/️/g, '');
  return EMOJI_KEYS[bare] || EMOJI_KEYS[[...bare][0]] || fallback;
}

export default function LucideIcon({ name, size = 18, color = '#0F172A', strokeWidth = 2.2, fallback, style }) {
  const Icon = ICONS[iconKeyFor(name, fallback)];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}
