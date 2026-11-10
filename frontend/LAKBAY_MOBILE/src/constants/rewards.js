// XP rewards shared across the app.

// AR museum artworks: XP for the first scan, by rarity.
export const RARITY_XP = {
  common: 40,
  rare: 70,
  mythical: 100,
  legendary: 150,
};

export const rarityXp = (rarity) => RARITY_XP[(rarity || 'common').toLowerCase()] || RARITY_XP.common;

// Catch: XP for the first catch, set per place by the admin (web CMS), 150 by default.
export const DEFAULT_CATCH_XP = 150;

export const catchXpFor = (spot) => {
  const xp = parseInt(spot?.catch_xp_reward, 10);
  return Number.isFinite(xp) && xp > 0 ? xp : DEFAULT_CATCH_XP;
};
