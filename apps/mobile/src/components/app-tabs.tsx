import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { useBusinessType } from '@/lib/business';
import { useT } from '@/lib/i18n';

/**
 * Tabs follow the business type (Profile → Business type):
 *   Retail   Sell · Today · Products · Orders · More   (unchanged)
 *   Service  Jobs · Sell · Today · Services · More
 *   Both     Sell · Jobs · Today · Catalog · More
 * Orders stays a (hidden) tab for service businesses, reached from More.
 */
export default function AppTabs() {
  const colors = useTheme();
  const t = useT();
  const type = useBusinessType();
  const services = type !== 'RETAIL';

  const sell = (
    <NativeTabs.Trigger key="sell" name="(sell)">
      <NativeTabs.Trigger.Label>{t('tabs.sell')}</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'barcode.viewfinder', selected: 'barcode.viewfinder' }} md="barcode_scanner" />
    </NativeTabs.Trigger>
  );
  const jobs = (
    <NativeTabs.Trigger key="jobs" name="jobs" hidden={!services}>
      <NativeTabs.Trigger.Label>{t('tabs.jobs')}</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill' }} md="build" />
    </NativeTabs.Trigger>
  );
  const today = (
    <NativeTabs.Trigger key="dashboard" name="dashboard">
      <NativeTabs.Trigger.Label>{t('tabs.today')}</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="insights" />
    </NativeTabs.Trigger>
  );
  const catalog = (
    <NativeTabs.Trigger key="products" name="products">
      <NativeTabs.Trigger.Label>
        {type === 'SERVICE' ? t('tabs.services') : type === 'HYBRID' ? t('tabs.catalog') : t('tabs.products')}
      </NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} md="inventory_2" />
    </NativeTabs.Trigger>
  );
  const orders = (
    <NativeTabs.Trigger key="orders" name="orders" hidden={services}>
      <NativeTabs.Trigger.Label>{t('tabs.orders')}</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'receipt', selected: 'receipt.fill' }} md="receipt_long" />
    </NativeTabs.Trigger>
  );
  const more = (
    <NativeTabs.Trigger key="more" name="more">
      <NativeTabs.Trigger.Label>{t('tabs.more')}</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }} md="more_horiz" />
    </NativeTabs.Trigger>
  );

  // Selling comes first for shops; a repair shop starts its day on the jobs board.
  const order = type === 'SERVICE' ? [jobs, sell, today, catalog, orders, more] : [sell, jobs, today, catalog, orders, more];

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.backgroundSelected}
      tintColor={colors.primary}
      // Android rasterises `md` icons in white and relies on this tint; without it
      // they vanish against a light tab bar.
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.primary },
      }}
      // Always show every label — clearer at the counter than icon-only tabs.
      labelVisibilityMode="labeled">
      {order}
    </NativeTabs>
  );
}
