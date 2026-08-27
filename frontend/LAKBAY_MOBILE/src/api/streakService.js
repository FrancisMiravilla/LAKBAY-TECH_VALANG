import * as SecureStore from 'expo-secure-store';
import { authService } from './authService';

const KEY_LAST_DATE = 'daily_streak_last_date';
const KEY_STREAK_COUNT = 'daily_streak_count';
const KEY_CLAIMED_DATE = 'daily_streak_claimed_date';

/**
 * Returns current date as 'YYYY-MM-DD' in local timezone.
 */
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates calendar day difference between two 'YYYY-MM-DD' strings.
 * Returns d1 - d2 in days.
 */
export const getDayDifference = (dateStr1, dateStr2) => {
  if (!dateStr1 || !dateStr2) return null;
  try {
    const [y1, m1, d1] = dateStr1.split('-').map(Number);
    const [y2, m2, d2] = dateStr2.split('-').map(Number);
    const obj1 = new Date(y1, m1 - 1, d1);
    const obj2 = new Date(y2, m2 - 1, d2);
    return Math.round((obj1.getTime() - obj2.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

export const streakService = {
  /**
   * Reads streak data without modifying it.
   */
  getStreakData: async () => {
    try {
      const today = getTodayDateString();
      const lastDate = await SecureStore.getItemAsync(KEY_LAST_DATE);
      const rawCount = await SecureStore.getItemAsync(KEY_STREAK_COUNT);
      const claimedDate = await SecureStore.getItemAsync(KEY_CLAIMED_DATE);

      const storedStreak = parseInt(rawCount, 10) || 0;
      const diff = getDayDifference(today, lastDate);

      let currentStreak = 1;
      if (diff === null) {
        // First time
        currentStreak = storedStreak > 0 ? storedStreak : 1;
      } else if (diff === 0) {
        // Opened today
        currentStreak = storedStreak > 0 ? storedStreak : 1;
      } else if (diff === 1) {
        // Opened yesterday -> next streak day
        currentStreak = storedStreak + 1;
      } else {
        // Missed 2+ days -> reset to 1
        currentStreak = 1;
      }

      const claimedToday = claimedDate === today;
      return {
        streak: currentStreak,
        claimedToday,
        canClaim: !claimedToday,
        lastDate,
        today,
        diff,
      };
    } catch (error) {
      console.warn('getStreakData error:', error);
      return {
        streak: 1,
        claimedToday: false,
        canClaim: true,
        lastDate: null,
        today: getTodayDateString(),
        diff: null,
      };
    }
  },

  /**
   * Records today's visit and updates streak count.
   */
  recordLoginStreak: async () => {
    try {
      const today = getTodayDateString();
      const lastDate = await SecureStore.getItemAsync(KEY_LAST_DATE);
      const rawCount = await SecureStore.getItemAsync(KEY_STREAK_COUNT);
      const claimedDate = await SecureStore.getItemAsync(KEY_CLAIMED_DATE);

      const storedStreak = parseInt(rawCount, 10) || 0;
      const diff = getDayDifference(today, lastDate);

      let newStreak = 1;
      if (diff === null) {
        newStreak = 1;
      } else if (diff === 0) {
        newStreak = storedStreak > 0 ? storedStreak : 1;
      } else if (diff === 1) {
        newStreak = storedStreak + 1;
      } else {
        // Missed more than 1 day -> reset back to day 1
        newStreak = 1;
      }

      await SecureStore.setItemAsync(KEY_LAST_DATE, today);
      await SecureStore.setItemAsync(KEY_STREAK_COUNT, String(newStreak));

      const claimedToday = claimedDate === today;
      return {
        streak: newStreak,
        claimedToday,
        canClaim: !claimedToday,
        today,
      };
    } catch (error) {
      console.warn('recordLoginStreak error:', error);
      return {
        streak: 1,
        claimedToday: false,
        canClaim: true,
        today: getTodayDateString(),
      };
    }
  },

  /**
   * Claims +10 XP for today's daily streak.
   */
  claimStreakReward: async (streakCount = 1) => {
    try {
      const today = getTodayDateString();
      const claimedDate = await SecureStore.getItemAsync(KEY_CLAIMED_DATE);

      if (claimedDate === today) {
        return { success: false, alreadyClaimed: true, streak: streakCount };
      }

      // Award +10 XP
      const xpResult = await authService.adjustXP(10);

      // Save claimed state
      await SecureStore.setItemAsync(KEY_CLAIMED_DATE, today);
      await SecureStore.setItemAsync(KEY_LAST_DATE, today);
      await SecureStore.setItemAsync(KEY_STREAK_COUNT, String(streakCount));

      return {
        success: true,
        earnedXP: 10,
        streak: streakCount,
        newXp: xpResult?.xp,
      };
    } catch (error) {
      console.warn('claimStreakReward error:', error);
      return { success: false, error };
    }
  },
};
