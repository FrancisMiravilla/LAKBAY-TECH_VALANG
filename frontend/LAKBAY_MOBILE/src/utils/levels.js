// Explorer level curve. Level 1 needs 100 XP; from level 2 on the XP needed per
// level starts at 150 and grows in a repeating +25, +25, +50 cycle:
// 150, 175, 200, 250, 275, 300, 350, ...
// Keep in sync with backend/accounts/levels.py (the server uses it for spot locks).

const STEP_OFFSETS = [0, 25, 50];

export function xpForLevel(level) {
  if (level <= 1) return 100;
  const i = level - 2;
  return 150 + Math.floor(i / 3) * 100 + STEP_OFFSETS[i % 3];
}

// { level, levelXp (earned inside this level), levelCost (needed for this level), progressPct }
export function getLevelInfo(xp) {
  let rest = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level += 1;
  }
  const levelCost = xpForLevel(level);
  return { level, levelXp: rest, levelCost, progressPct: rest / levelCost };
}

export function levelForXp(xp) {
  return getLevelInfo(xp).level;
}
