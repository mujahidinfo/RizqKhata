import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'caption' | 'code';
  themeColor?: ThemeColor;
};

/**
 * Bengali (incl. the ৳ sign), other Indic scripts and Arabic have marks that
 * rise well above Latin capitals; with a Latin-tuned lineHeight iOS clips them.
 */
const TALL_SCRIPT = /[\u0600-\u06FF\u0900-\u0DFF]/;
const LATIN_MIN_RATIO = 1.25;
// Web only: Bangla in the self-hosted Noto Sans Bengali, Latin in the system font
// (see WebFontStack). Native keeps the platform fonts.
const WEB_FONT = Platform.OS === 'web' ? { fontFamily: Fonts.sans } : null;
const TALL_MIN_RATIO = 1.5;

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

export function ThemedText({ style, type = 'default', themeColor, children, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const base = [{ color: theme[themeColor ?? 'text'] }, WEB_FONT, styles[type], style];

  // Keep the line tall enough for the glyphs actually shown, so a bigger
  // fontSize override or Bengali text is never cut off at the top.
  const { fontSize, lineHeight } = StyleSheet.flatten(base) as TextStyle;
  const ratio = TALL_SCRIPT.test(textOf(children)) ? TALL_MIN_RATIO : LATIN_MIN_RATIO;
  const minLineHeight = fontSize ? Math.ceil(fontSize * ratio) : undefined;
  const roomy = minLineHeight && lineHeight && lineHeight < minLineHeight ? { lineHeight: minLineHeight } : null;

  return (
    <Text style={[base, roomy]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
