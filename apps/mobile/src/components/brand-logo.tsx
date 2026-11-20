import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const APP_NAME = 'Rizq Khata';

// Width ÷ height of the generated PNGs, so the logo is never stretched.
const RATIO = { wordmark: 1200 / 261, mark: 512 / 401 };

const LOGOS = {
  wordmark: {
    light: require('@/assets/images/logo-wordmark.png'),
    dark: require('@/assets/images/logo-wordmark-dark.png'),
  },
  mark: {
    light: require('@/assets/images/logo-mark.png'),
    dark: require('@/assets/images/logo-mark-dark.png'),
  },
};

/**
 * Rizq Khata logo. `wordmark` = mark + name, `mark` = the icon alone. The dark
 * variant lightens the slate parts so they read on dark backgrounds.
 */
export function BrandLogo({
  variant = 'wordmark',
  height = 40,
  style,
}: {
  variant?: 'wordmark' | 'mark';
  height?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const width = height * RATIO[variant];
  return (
    <Image
      source={LOGOS[variant][scheme]}
      style={[{ width, height }, style]}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel={APP_NAME}
    />
  );
}
