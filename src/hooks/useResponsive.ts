import { useWindowDimensions, type ViewStyle } from 'react-native';
import { CONTENT_MAX_WIDTH } from '@/src/config';

/** Responsive layout helpers for phone + tablet */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 380;
  const isTablet = width >= 768;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH);

  const contentStyle: ViewStyle = {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  };

  const pad = isCompact ? 14 : isTablet ? 28 : 20;
  const titleScale = isCompact ? 0.9 : 1;

  return {
    width,
    height,
    isCompact,
    isTablet,
    contentWidth,
    contentStyle,
    pad,
    titleScale,
  };
}
