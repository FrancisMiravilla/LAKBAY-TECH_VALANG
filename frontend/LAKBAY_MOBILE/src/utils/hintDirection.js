// Reads a compass direction out of an AR target hint written by the admin,
// e.g. "Go to the western part of S2" → West (270°).
// English and Filipino words are accepted; intercardinals win over cardinals.

const DIRECTIONS = [
  { label: 'North-East', short: 'NE', bearing: 45,  pattern: /\bnorth[\s-]*east(ern)?\b|\bhilagang[\s-]*silangan\b/i },
  { label: 'North-West', short: 'NW', bearing: 315, pattern: /\bnorth[\s-]*west(ern)?\b|\bhilagang[\s-]*kanluran\b/i },
  { label: 'South-East', short: 'SE', bearing: 135, pattern: /\bsouth[\s-]*east(ern)?\b|\btimog[\s-]*silangan\b/i },
  { label: 'South-West', short: 'SW', bearing: 225, pattern: /\bsouth[\s-]*west(ern)?\b|\btimog[\s-]*kanluran\b/i },
  { label: 'North',      short: 'N',  bearing: 0,   pattern: /\bnorth(ern|ward|wards)?\b|\bhilaga\b/i },
  { label: 'East',       short: 'E',  bearing: 90,  pattern: /\beast(ern|ward|wards)?\b|\bsilangan\b/i },
  { label: 'South',      short: 'S',  bearing: 180, pattern: /\bsouth(ern|ward|wards)?\b|\btimog\b/i },
  { label: 'West',       short: 'W',  bearing: 270, pattern: /\bwest(ern|ward|wards)?\b|\bkanluran\b/i },
];

export function parseHintDirection(hint) {
  if (!hint) return null;
  const found = DIRECTIONS.find((d) => d.pattern.test(hint));
  return found ? { label: found.label, short: found.short, bearing: found.bearing } : null;
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function cardinalFor(heading) {
  return CARDINALS[Math.round((((heading % 360) + 360) % 360) / 45) % 8];
}
