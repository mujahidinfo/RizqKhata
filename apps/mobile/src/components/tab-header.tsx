import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { ProfileButton } from '@/components/profile-button';
import { ShopTitle } from '@/components/shop-title';

type ScreenOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Top bar shared by every tab's root screen: shop on the left, theme toggle +
 * avatar on the right.
 *
 * On iOS 26 the system wraps custom header items in a Liquid Glass capsule,
 * which looks lumpy around our own round tiles. Passing them as header items
 * with `hidesSharedBackground` drops that capsule, so the items sit on the bar
 * as drawn. Android (and older iOS) use plain headerLeft/headerRight.
 */
export const tabHeaderOptions: ScreenOptions =
  process.env.EXPO_OS === 'ios'
    ? {
        unstable_headerLeftItems: () => [{ type: 'custom', element: <ShopTitle />, hidesSharedBackground: true }],
        unstable_headerRightItems: () => [{ type: 'custom', element: <ProfileButton />, hidesSharedBackground: true }],
      }
    : {
        // The tab bar already names the screen; the shop takes the title's place.
        headerTitle: '',
        headerLeft: () => <ShopTitle />,
        headerRight: () => <ProfileButton />,
      };
