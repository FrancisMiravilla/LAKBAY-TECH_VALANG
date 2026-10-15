import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Floating glass tab bar geometry, shared by the navigator and the tab screens.
export const TAB_BAR_HEIGHT = 60;
export const TAB_COUNT = 5;
export const TAB_ITEM_SIZE = 46;   // touch slot per icon
export const TAB_ICON_SIZE = 44;   // highlighted circle inside the slot
export const TAB_BAR_PADDING = 8;
// Icon-only bar sized to its tabs and centred, never closer than 16 px to the edges.
export const TAB_BAR_WIDTH = TAB_COUNT * TAB_ITEM_SIZE + TAB_BAR_PADDING * 2;
export const TAB_BAR_SIDE_MARGIN = Math.max(16, (Dimensions.get('window').width - TAB_BAR_WIDTH) / 2);
export const TAB_BAR_GAP = 10;

/** Distance from the screen bottom to the bar's bottom edge. */
export function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 8) + TAB_BAR_GAP;
}

/** Bottom padding a scrolling tab screen needs so its last item clears the floating bar. */
export function useTabBarSpace() {
  return useTabBarBottom() + TAB_BAR_HEIGHT + 16;
}
