/**
 * Browser-only CSS the React Native styles can't express: the Bangla font and
 * scrollbars.
 * Imported once by the root layout; the native twin (web-styles.ts) is empty.
 *
 * Default Windows scrollbars are 17px grey slabs with arrow buttons, and in a
 * centred column they draw a stripe down the middle of the screen. These are a
 * thin rounded thumb on a transparent track that stays faint until the pointer
 * is over the scrolling area, so a column reads as part of the page.
 */
import { WebFontStack } from '@/constants/theme';

const FONT_STACK = WebFontStack;

const CSS = `
/* Bangla: Noto Sans Bengali, the same face Android uses, self-hosted so it works
   offline. unicode-range limits it to Bengali (incl. the ৳ sign); Latin keeps the
   system font. Without it Windows browsers fall back to Vrinda / Nirmala UI. */
@font-face {
  font-family: "RK Bangla";
  src: url("/fonts/noto-sans-bengali.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0-1CF7, U+200C-200D, U+25CC, U+A8F1;
}
/* Typed Bangla in fields uses it too (attribute + element beats react-native-web's class). */
input[class], textarea[class] {
  font-family: ${FONT_STACK};
}
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 138, 150, 0.28) transparent;
}
*:hover {
  scrollbar-color: rgba(128, 138, 150, 0.55) transparent;
}
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
::-webkit-scrollbar-thumb {
  background-color: rgba(128, 138, 150, 0.28);
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: padding-box;
}
:hover::-webkit-scrollbar-thumb { background-color: rgba(128, 138, 150, 0.55); }
::-webkit-scrollbar-corner { background: transparent; }
`;

if (typeof document !== 'undefined' && !document.getElementById('rk-web-styles')) {
  const style = document.createElement('style');
  style.id = 'rk-web-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

export {};
