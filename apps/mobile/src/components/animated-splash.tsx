import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { APP_NAME } from '@/components/brand-logo';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/lib/i18n';

/**
 * Short, well-known texts on keeping accounts and honest trade. One is shown per
 * launch, with the translation in the app language. English follows Saheeh
 * International; the Bangla is a plain rendering of the same meaning — have a
 * scholar check both before release.
 */
const QUOTES = [
  {
    arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ',
    english: 'O you who have believed, when you contract a debt for a specified term, write it down.',
    bangla: 'হে মুমিনগণ! যখন তোমরা নির্দিষ্ট মেয়াদে ঋণের লেনদেন করো, তখন তা লিখে রাখো।',
    source: 'Al-Baqarah 2:282',
    sourceBn: 'সূরা আল-বাকারা ২:২৮২',
  },
  {
    arabic: 'وَأَوْفُوا الْكَيْلَ إِذَا كِلْتُمْ وَزِنُوا بِالْقِسْطَاسِ الْمُسْتَقِيمِ',
    english: 'And give full measure when you measure, and weigh with an even balance.',
    bangla: 'মেপে দেওয়ার সময় পূর্ণ মাপে দাও এবং সঠিক দাঁড়িপাল্লায় ওজন করো।',
    source: 'Al-Isra 17:35',
    sourceBn: 'সূরা আল-ইসরা ১৭:৩৫',
  },
  {
    arabic: 'حَاسِبُوا أَنْفُسَكُمْ قَبْلَ أَنْ تُحَاسَبُوا',
    english: 'Take account of yourselves before you are taken to account.',
    bangla: 'তোমাদের হিসাব নেওয়ার আগেই নিজেদের হিসাব নাও।',
    source: 'ʿUmar ibn al-Khaṭṭāb (RA)',
    sourceBn: 'উমর ইবনুল খাত্তাব (রা.)',
  },
] as const;

// Must match the native splash in app.json so the hand-off is invisible.
const BACKGROUND = { light: '#F3F4F7', dark: '#020817' };
const SPLASH_IMAGE = {
  light: require('@/assets/images/splash-icon.png'),
  dark: require('@/assets/images/splash-icon-dark.png'),
};
const IMAGE_SIZE = 180;

const PALETTE = {
  light: { green: '#17694C', slate: '#3F4A56', text: '#1F2937', muted: '#6B7280', line: '#17694C33' },
  dark: { green: '#3FBF8C', slate: '#E2E8F0', text: '#E5E7EB', muted: '#94A3B8', line: '#3FBF8C40' },
};

/** Shortest time the splash stays up, so the quote can actually be read. */
const MIN_VISIBLE_MS = 3200;
const EASE = Easing.inOut(Easing.cubic);

/**
 * Animated launch screen drawn over the app. It starts as an exact copy of the
 * native splash, hides that, then plays: logo zooms out and up → name → quote (Arabic,
 * English, source). Once `ready` and the minimum time has passed it fades away.
 * Tap to skip (once ready).
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = PALETTE[scheme];
  const reduceMotion = useReducedMotion();
  const bangla = useLanguage() === 'bn';
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const meaningText = bangla ? quote.bangla : quote.english;
  const sourceText = bangla ? quote.sourceBn : quote.source;
  const [minElapsed, setMinElapsed] = useState(false);
  const [done, setDone] = useState(false);
  const leaving = useRef(false);
  const started = useRef(false);

  const logo = useSharedValue(0); // 0 = native-splash position, 1 = raised
  const name = useSharedValue(0);
  const line = useSharedValue(0);
  const arabic = useSharedValue(0);
  const english = useSharedValue(0);
  const source = useSharedValue(0);
  const screen = useSharedValue(1);

  const start = () => {
    if (started.current) return;
    started.current = true;
    void SplashScreen.hideAsync();
    const t = (delay: number, duration = 600) => withDelay(delay, withTiming(1, { duration, easing: EASE }));
    // Smooth zoom-out into place: no overshoot.
    logo.value = t(150, reduceMotion ? 300 : 700);
    name.value = t(450);
    line.value = t(750, 700);
    arabic.value = t(1000, 700);
    english.value = t(1450);
    source.value = t(1800);
  };

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    screen.value = withTiming(0, { duration: 450, easing: EASE }, (finished) => {
      if (finished) scheduleOnRN(setDone, true);
    });
  };

  useEffect(() => {
    if (ready && minElapsed) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, minElapsed]);

  const rise = reduceMotion ? 0 : 1;
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -150 * logo.value * rise },
      { scale: 1 - 0.38 * logo.value * rise },
    ],
  }));
  // Text simply dissolves in.
  const fadeUp = (v: { value: number }) => () => {
    'worklet';
    return { opacity: v.value };
  };
  const nameStyle = useAnimatedStyle(fadeUp(name));
  const arabicStyle = useAnimatedStyle(fadeUp(arabic));
  const englishStyle = useAnimatedStyle(fadeUp(english));
  const sourceStyle = useAnimatedStyle(fadeUp(source));
  const lineStyle = useAnimatedStyle(() => ({ opacity: line.value, transform: [{ scaleX: line.value }] }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.value }));

  if (done) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: BACKGROUND[scheme] }, screenStyle]}
      onLayout={start}>
      <Pressable style={styles.fill} onPress={() => ready && leave()} accessibilityLabel={`${APP_NAME}. ${meaningText} ${sourceText}`}>
        {/* Same size and place as the native splash image. */}
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Animated.View style={logoStyle}>
            <Image source={SPLASH_IMAGE[scheme]} style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }} contentFit="contain" />
          </Animated.View>
        </View>

        <View style={[StyleSheet.absoluteFill, styles.center, styles.content]} pointerEvents="none">
          <Animated.View style={[styles.nameRow, nameStyle]}>
            <Text style={[styles.name, { color: colors.green }]}>Rizq</Text>
            <Text style={[styles.name, { color: colors.slate }]}>Khata</Text>
          </Animated.View>

          <Animated.View style={[styles.line, { backgroundColor: colors.line }, lineStyle]} />

          <Animated.Text style={[styles.arabic, { color: colors.text }, arabicStyle]}>{quote.arabic}</Animated.Text>
          <Animated.Text style={[styles.english, { color: colors.muted }, englishStyle]}>“{meaningText}”</Animated.Text>
          <Animated.Text style={[styles.source, { color: colors.green }, sourceStyle]}>{sourceText}</Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  // Text block sits under the raised logo.
  content: { paddingHorizontal: 32, paddingTop: 120, gap: 14 },
  nameRow: { flexDirection: 'row' },
  name: { fontSize: 30, fontWeight: '800', letterSpacing: 0.3 },
  line: { width: 56, height: 3, borderRadius: 2, marginVertical: 4 },
  arabic: { fontSize: 22, lineHeight: 40, textAlign: 'center', writingDirection: 'rtl' },
  english: { fontSize: 15, lineHeight: 22, textAlign: 'center', fontStyle: 'italic', maxWidth: 340 },
  source: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textAlign: 'center' },
});
