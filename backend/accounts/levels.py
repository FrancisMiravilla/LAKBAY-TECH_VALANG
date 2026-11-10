"""Explorer level curve.

Level 1 needs 100 XP. From level 2 on, the XP needed per level starts at 150
and grows in a repeating +25, +25, +50 cycle: 150, 175, 200, 250, 275, 300,
350, ... Keep in sync with frontend/LAKBAY_MOBILE/src/utils/levels.js.
"""

STEP_OFFSETS = (0, 25, 50)


def xp_for_level(level):
    """XP needed to go from `level` to `level + 1`."""
    if level <= 1:
        return 100
    group, pos = divmod(level - 2, 3)
    return 150 + group * 100 + STEP_OFFSETS[pos]


def level_info(xp):
    """Returns (level, xp earned inside this level, xp this level needs)."""
    xp = max(0, int(xp or 0))
    level = 1
    while xp >= xp_for_level(level):
        xp -= xp_for_level(level)
        level += 1
    return level, xp, xp_for_level(level)


def level_for_xp(xp):
    return level_info(xp)[0]
