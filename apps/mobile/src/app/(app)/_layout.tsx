import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { HeaderSafeArea } from '@/components/safe-area';
import { SyncProvider } from '@/components/sync-provider';
import { CartProvider } from '@/lib/cart';
import { useT } from '@/lib/i18n';

/**
 * Signed-in app: the tab bar plus POS sheets that open above it. The cart lives
 * here so the scanner, product search, quick-add and checkout all share it.
 */
export default function AppLayout() {
  const modalPresentation = Platform.OS === 'ios' ? 'modal' : 'card';
  const t = useT();

  return (
    <SyncProvider>
      <CartProvider>
        <Stack
          screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}
          // On iOS the header is translucent and screens are drawn underneath it;
          // keep every sheet / pushed screen's content below it. The tabs handle
          // their own (they have no header here).
          screenLayout={({ route, children }) =>
            route.name === '(tabs)' ? <>{children}</> : <HeaderSafeArea>{children}</HeaderSafeArea>
          }>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-item"
            options={{ presentation: modalPresentation, title: t('screens.addItem') }}
          />
          <Stack.Screen
            name="new-product"
            options={{ presentation: modalPresentation, title: t('screens.newProduct') }}
          />
          <Stack.Screen
            name="cart"
            options={{ presentation: modalPresentation, title: t('screens.cart') }}
          />
          <Stack.Screen
            name="checkout"
            options={{ presentation: modalPresentation, title: t('screens.checkout') }}
          />
          <Stack.Screen
            name="branches"
            options={{ presentation: modalPresentation, title: t('screens.branches') }}
          />
          <Stack.Screen
            name="receive-stock"
            options={{ presentation: modalPresentation, title: t('screens.receiveStock') }}
          />
          <Stack.Screen
            name="member-form"
            options={{ presentation: modalPresentation, title: t('screens.staffMember') }}
          />
          <Stack.Screen
            name="supplier-form"
            options={{ presentation: modalPresentation, title: t('screens.supplier') }}
          />
          <Stack.Screen
            name="supplier-payment"
            options={{ presentation: modalPresentation, title: t('screens.paySupplier') }}
          />
          {/* Profile is a normal push (back arrow); its edit forms are sheets. */}
          <Stack.Screen name="profile" options={{ title: t('screens.profile') }} />
          <Stack.Screen name="currency" options={{ title: t('screens.currency') }} />
          <Stack.Screen
            name="shop-form"
            options={{ presentation: modalPresentation, title: t('screens.shopDetails') }}
          />
          <Stack.Screen
            name="change-password"
            options={{ presentation: modalPresentation, title: t('screens.changePassword') }}
          />
          <Stack.Screen
            name="pay-bill"
            options={{ presentation: modalPresentation, title: t('screens.recordPayment') }}
          />
          <Stack.Screen
            name="recurring-form"
            options={{ presentation: modalPresentation, title: t('screens.repeatingBill') }}
          />
          <Stack.Screen
            name="employee-form"
            options={{ presentation: modalPresentation, title: t('screens.payroll') }}
          />
          <Stack.Screen name="job-form" options={{ presentation: modalPresentation, title: t('screens.newJob') }} />
          <Stack.Screen name="job-items" options={{ presentation: modalPresentation, title: t('screens.addToJob') }} />
          <Stack.Screen name="job-deliver" options={{ presentation: modalPresentation, title: t('screens.billJob') }} />
          <Stack.Screen name="business-type" options={{ presentation: modalPresentation, title: t('screens.businessType') }} />
          <Stack.Screen name="customer-form" options={{ presentation: modalPresentation, title: t('screens.customer') }} />
          <Stack.Screen name="note-form" options={{ presentation: modalPresentation, title: t('screens.notes') }} />
          <Stack.Screen
            name="sync"
            options={{ presentation: modalPresentation, title: t('screens.sync') }}
          />
          <Stack.Screen
            name="expense-form"
            options={{ presentation: modalPresentation, title: t('screens.expense') }}
          />
        </Stack>
      </CartProvider>
    </SyncProvider>
  );
}
