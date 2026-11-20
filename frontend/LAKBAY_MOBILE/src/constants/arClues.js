// ARCore only recognizes flat images, so a 3D object (ARTarget.is_object) is
// registered with a photo of its placard; clues tell the player to scan that.
export const PLACARD_CLUE = 'This one is a 3D object. Scan its placard to reveal the model!';

export const hasClue = (t) => !!(t && ((t.hint && t.hint.trim().length > 0) || t.is_object));

// Clues never name the artwork (that would give it away). Lists go by building,
// then rarity from Common to Legendary, then slot number.
export const BUILDING_ORDER = ['S2', 'S3', 'S4'];
export const RARITY_ORDER = ['common', 'rare', 'mythical', 'legendary'];

const rank = (list, value) => {
  const i = list.indexOf(value);
  return i === -1 ? list.length : i;
};

export const clueBuilding = (t) => (t?.building || 'S2').toUpperCase();
const clueRarity = (t) => (t?.rarity || 'common').toLowerCase();

export function sortClues(targets) {
  return [...targets].sort((a, b) =>
    rank(BUILDING_ORDER, clueBuilding(a)) - rank(BUILDING_ORDER, clueBuilding(b))
    || rank(RARITY_ORDER, clueRarity(a)) - rank(RARITY_ORDER, clueRarity(b))
    || (a.slot_number || 0) - (b.slot_number || 0));
}

// [{ building, targets }] in building order, each sorted Common to Legendary.
export function groupCluesByBuilding(targets) {
  const groups = new Map();
  sortClues(targets).forEach((t) => {
    const b = clueBuilding(t);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b).push(t);
  });
  return [...groups.entries()].map(([building, list]) => ({ building, targets: list }));
}

// "Mystery 3D object" / "Mystery artwork": what a clue shows instead of the name.
export const mysteryLabel = (t) => (t?.is_object ? 'Mystery 3D object' : 'Mystery artwork');

// "a legendary artwork" for the guide's spoken clue.
export const mysteryPhrase = (t) => {
  const rarity = clueRarity(t);
  const article = /^[aeiou]/.test(rarity) ? 'an' : 'a';
  return `${article} ${rarity} ${t?.is_object ? '3D object' : 'artwork'}`;
};
