"""Avatar decorations a player unlocks by earning XP.

Thresholds follow the default XP milestone tiers (Coastal Scout 0, Vinta
Helmsman 151, Strait Navigator 401, Harbor Sentinel 801, Archipelago Voyager
1401, Admiral of the Western Seas 2201). The mobile app draws each item by id;
this module is the source of truth for which ids exist and when they unlock.
"""

TIER_XP = {1: 0, 2: 151, 3: 401, 4: 801, 5: 1401, 6: 2201}

# slot -> model field on CustomUser
SLOT_FIELDS = {
    'hat': 'avatar_hat',
    'frame': 'avatar_frame',
    'pin': 'avatar_pin',
    'backdrop': 'profile_backdrop',
}

CATALOG = {
    'hat': [
        ('', 'No Hat', 1),
        ('cap', 'Explorer Cap', 1),
        ('salakot', 'Salakot', 2),
        ('safari', 'Safari Helmet', 3),
        ('captain', "Captain's Cap", 4),
        ('crown', 'Admiral Crown', 6),
    ],
    'frame': [
        ('', 'Simple Ring', 1),
        ('vinta', 'Vinta Stripes', 1),
        ('teal', 'Sea Breeze', 2),
        ('gold', 'Golden Ring', 3),
        ('garland', 'Sampaguita Garland', 4),
        ('royal', 'Royal Ring', 6),
    ],
    'pin': [
        ('', 'No Pin', 1),
        ('compass', 'Compass Pin', 1),
        ('anchor', 'Anchor Pin', 2),
        ('sailboat', 'Vinta Pin', 3),
        ('landmark', 'Fort Pilar Pin', 4),
        ('gem', 'Voyager Gem', 5),
    ],
    'backdrop': [
        ('', 'Vinta Sails', 1),
        ('zamboanga', 'Zamboanga Skyline', 2),
        ('museum', 'National Museum', 3),
        ('sunset', 'Paseo Sunset', 4),
        ('night', 'Moonlit Strait', 5),
    ],
}


def catalog_for(xp):
    """All items with their unlock XP and whether this XP has unlocked them."""
    return [
        {
            'slot': slot,
            'id': item_id,
            'name': name,
            'tier': tier,
            'min_xp': TIER_XP[tier],
            'unlocked': xp >= TIER_XP[tier],
        }
        for slot, items in CATALOG.items()
        for item_id, name, tier in items
    ]


def min_xp_for(slot, item_id):
    """Unlock XP for an item, or None when the slot/item does not exist."""
    for candidate, _name, tier in CATALOG.get(slot, []):
        if candidate == item_id:
            return TIER_XP[tier]
    return None


def equipped(user):
    return {slot: getattr(user, field) or '' for slot, field in SLOT_FIELDS.items()}
