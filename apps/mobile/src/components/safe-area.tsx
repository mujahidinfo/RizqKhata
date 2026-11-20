import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { Spacing, WideLayout } from '@/constants/theme';
import { useWideLayout } from '@/hooks/use-wide-layout';

/*
 * Native safe areas for tab screens.
 *
 * On iOS the stack header and the NativeTabs bar are translucent and float over
 * the screen, so a screen whose first child isn't a scroll view (search bar on
 * top, list below) is drawn underneath them. react-native-screens' native
 * SafeAreaView reads the screen's UIKit `safeAreaInsets`, which include the
 * status bar, navigation bar *and* tab bar — not just the device notch.
 *
 * Android: the header is opaque and NativeTabs already pads the bottom, so a
 * plain View is enough there.
 */
const IOS = process.env.EXPO_OS === 'ios';

/**
 * Root of a tab screen with fixed content above a list. Keeps that content
 * below the header; the list inside should use `contentInsetAdjustmentBehavior="automatic"`
 * so it still scrolls under the tab bar.
 */
export function TabScreen({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  if (!IOS) return <View style={[{ flex: 1 }, style]}>{children}</View>;
  return (
    <SafeAreaView edges={{ top: true, left: true, right: true }} style={style}>
      {children}
    </SafeAreaView>
  );
}

/**
 * Keeps a stack screen's content below its (translucent) header. Used once, as
 * the `screenLayout` of the signed-in stack, so every sheet and pushed screen
 * gets it. Scroll views inside still adjust their own insets, and since this
 * view already sits below the header they don't add the top inset twice.
 * In a desktop browser it also centres the sheet at a readable width.
 */
export function HeaderSafeArea({ children }: { children: ReactNode }) {
  const wide = useWideLayout();
  // Desktop browser: forms and sheets read better as a centred column.
  if (wide) return <View style={{ flex: 1, width: '100%', maxWidth: WideLayout.sheetMaxWidth, alignSelf: 'center' }}>{children}</View>;
  if (!IOS) return <>{children}</>;
  return <SafeAreaView edges={{ top: true }}>{children}</SafeAreaView>;
}

/**
 * Pins its children just above the tab bar (cart bar, floating buttons). Place
 * inside a `flex: 1` screen. Touches outside the children fall through.
 */
export function FloatingBottom({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const content = (
    <View pointerEvents="box-none" style={[{ paddingBottom: Spacing.three }, style]}>
      {children}
    </View>
  );
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      {IOS ? (
        <SafeAreaView edges={{ bottom: true }} pointerEvents="box-none" style={{ flex: 0 }}>
          {content}
        </SafeAreaView>
      ) : (
        content
      )}
    </View>
  );
}
