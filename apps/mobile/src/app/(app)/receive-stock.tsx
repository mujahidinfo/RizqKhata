import * as Haptics from 'expo-haptics';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  findByBarcode,
  useCreatePurchase,
  useProducts,
  useReorderSuggestions,
  useSuppliers,
} from '@/api/queries';
import type { PaymentMethod, Product } from '@/api/types';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { Button } from '@/components/button';
import { Chip, Segmented } from '@/components/choice';
import { Icon } from '@/components/icon';
import { IconTile, TINT } from '@/components/icon-tile';
import { Panel } from '@/components/panel';
import { ProductThumb } from '@/components/product-thumb';
import { QueryState } from '@/components/query-state';
import { SearchPill } from '@/components/sell/search-pill';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

type Line = {
  variantId: string;
  productId: string;
  name: string;
  imageUrl?: string | null;
  /** Stock in this branch before the delivery, when known. */
  stock?: number;
  quantity: string;
  unitCost: string;
};

type Payment = 'full' | 'later' | 'part';

type Receipt = {
  items: number;
  units: number;
  total: number;
  paid: number;
  supplierId: string | null;
  /** Saved offline; syncs later. */
  queued: boolean;
};

const METHODS: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER'];

const toNumber = (text: string) => Number(text.replace(/,/g, ''));
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * `/receive-stock` — receive a delivery. `?supplierId=` preselects the
 * supplier; `?reorder=1` opens pre-filled with low-stock items (and their usual
 * supplier) so restocking is a review-and-confirm.
 */
export default function ReceiveStockScreen() {
  const params = useLocalSearchParams<{ supplierId?: string; reorder?: string }>();
  const reorder = params.reorder === '1';
  const suggestions = useReorderSuggestions(reorder, params.supplierId);

  if (!reorder) return <ReceiveStockForm initialSupplierId={params.supplierId ?? null} initialLines={[]} />;
  if (!suggestions.data) {
    return <QueryState isLoading={suggestions.isLoading} error={suggestions.error} onRetry={suggestions.refetch} />;
  }

  const items = suggestions.data;
  // One supplier for everything → preselect it; mixed → let the user choose.
  const supplierIds = new Set(items.map((i) => i.supplier?.id ?? null));
  const supplierId = params.supplierId ?? (supplierIds.size === 1 ? [...supplierIds][0] : null);
  return (
    <ReceiveStockForm
      initialSupplierId={supplierId}
      initialLines={items.map((i) => ({
        variantId: i.variantId,
        productId: i.productId,
        name: i.name,
        imageUrl: i.imageUrl,
        stock: i.stock,
        quantity: String(i.suggestedQuantity),
        unitCost: i.unitCost ? String(i.unitCost) : '',
      }))}
      reorderCount={items.length}
    />
  );
}

/**
 * Receive a delivery into the active branch:
 * pick the supplier, scan or search each item, set quantity and cost, say how
 * much was paid, and confirm.
 */
function ReceiveStockForm({
  initialSupplierId,
  initialLines,
  reorderCount,
}: {
  initialSupplierId: string | null;
  initialLines: Line[];
  reorderCount?: number;
}) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const formatCurrency = useFormatCurrency();
  const suppliers = useSuppliers();
  const createPurchase = useCreatePurchase();

  const [supplierId, setSupplierId] = useState<string | null>(initialSupplierId);
  const [lines, setLines] = useState<Line[]>(initialLines);
  // A pre-filled reorder is reviewed, not scanned: start with the camera off.
  const [scanning, setScanning] = useState(reorderCount === undefined);
  const [search, setSearch] = useState('');
  const [pickVariantOf, setPickVariantOf] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment>('full');
  const [partAmount, setPartAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [updateCost, setUpdateCost] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const busy = useRef(false);

  const debounced = useDebouncedValue(search.trim(), 250);
  const results = useProducts(debounced);
  const matches = debounced ? (results.data?.pages[0]?.items.slice(0, 6) ?? []) : [];

  const total = round2(lines.reduce((sum, l) => sum + (toNumber(l.quantity) || 0) * (toNumber(l.unitCost) || 0), 0));
  const units = lines.reduce((sum, l) => sum + (toNumber(l.quantity) || 0), 0);
  const linesValid =
    lines.length > 0 &&
    lines.every((l) => Number.isInteger(toNumber(l.quantity)) && toNumber(l.quantity) > 0 && toNumber(l.unitCost) >= 0);
  const paidAmount = !supplierId ? 0 : payment === 'full' ? total : payment === 'later' ? 0 : toNumber(partAmount) || 0;
  const paymentValid = payment !== 'part' || (paidAmount >= 0 && paidAmount <= total);
  const owed = round2(Math.max(total - paidAmount, 0));
  const supplier = suppliers.data?.find((s) => s.id === supplierId);

  const addVariant = (product: Product, variantId: string) => {
    const variant = product.variants.find((v) => v.id === variantId)!;
    setLines((current) => {
      const existing = current.find((l) => l.variantId === variantId);
      if (existing) {
        return current.map((l) => (l === existing ? { ...l, quantity: String((toNumber(l.quantity) || 0) + 1) } : l));
      }
      return [
        {
          variantId,
          productId: product.id,
          name: variant.isDefault ? product.name : `${product.name} (${variant.name})`,
          imageUrl: product.imageUrl,
          stock: variant.stock,
          quantity: '1',
          // Start from the last known cost; usually unchanged.
          unitCost: String(product.costPrice || ''),
        },
        ...current,
      ];
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addProduct = (product: Product, matchedVariantId?: string | null) => {
    setNotFound(null);
    const variantId = matchedVariantId ?? (product.variants.length === 1 ? product.variants[0].id : null);
    if (variantId) addVariant(product, variantId);
    else setPickVariantOf(product);
  };

  const onScan = async (code: string) => {
    if (busy.current || pickVariantOf) return;
    busy.current = true;
    try {
      const product = await findByBarcode(code);
      if (product) addProduct(product, product.matchedVariantId);
      else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setNotFound(code);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('receive.lookupFailed'));
    } finally {
      busy.current = false;
    }
  };

  const updateLine = (variantId: string, patch: Partial<Line>) =>
    setLines((current) => current.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)));

  const bump = (l: Line, by: number) => {
    const next = Math.max((toNumber(l.quantity) || 0) + by, 1);
    updateLine(l.variantId, { quantity: String(next) });
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
  };

  const save = async () => {
    setError(null);
    const paid = round2(paidAmount);
    try {
      const result = await createPurchase.mutateAsync({
        total,
        supplierId: supplierId ?? undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: toNumber(l.quantity),
          unitCost: toNumber(l.unitCost) || 0,
        })),
        paidAmount: paid,
        paymentMethod: method,
        updateCostPrice: updateCost,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReceipt({ items: lines.length, units, total, paid, supplierId, queued: result.status === 'queued' });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('receive.couldNotSave'));
    }
  };

  const receiveMore = () => {
    setReceipt(null);
    setLines([]);
    setSearch('');
    setPayment('full');
    setPartAmount('');
    setScanning(true);
  };

  if (receipt) {
    const receiptSupplier = suppliers.data?.find((s) => s.id === receipt.supplierId);
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: Spacing.four, gap: Spacing.four, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: Spacing.two }}>
          <IconTile name="tick" tint={TINT.emerald} size={72} />
          <ThemedText type="subtitle">{t('receive.stockReceived')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {t('receive.addedToShelves', {
              units: t('common.units', { count: receipt.units }),
              products: t('common.products', { count: receipt.items }),
            })}
          </ThemedText>
          {receipt.queued && (
            <ThemedText type="smallBold" style={{ color: theme.warning, textAlign: 'center' }}>
              {t('receive.savedOffline')}
            </ThemedText>
          )}
        </View>
        <Panel>
          <SummaryLine label={t('receive.deliveryTotal')} value={formatCurrency(receipt.total)} bold />
          {receiptSupplier && <SummaryLine label={t('receive.from')} value={receiptSupplier.name} />}
          {receipt.supplierId && <SummaryLine label={t('receive.paidNow')} value={formatCurrency(receipt.paid)} />}
          {receipt.supplierId && receipt.total - receipt.paid > 0.005 && (
            <SummaryLine label={t('receive.stillOwed')} value={formatCurrency(receipt.total - receipt.paid)} danger />
          )}
        </Panel>
        {receipt.supplierId && receipt.paid > 0 && (
          <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {t('receive.alsoExpense')}
          </ThemedText>
        )}
        <View style={{ gap: Spacing.two }}>
          <Button title={t('receive.receiveMore')} onPress={receiveMore} />
          {receipt.supplierId && (
            <Button
              title={t('receive.viewSupplier')}
              variant="secondary"
              onPress={() => {
                router.back();
                router.push({ pathname: '/more/supplier/[id]', params: { id: receipt.supplierId! } });
              }}
            />
          )}
          <Button title={t('common.done')} variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
        {reorderCount !== undefined && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              padding: Spacing.three,
              borderRadius: Radius.lg + 4,
              borderCurve: 'continuous',
              backgroundColor: `${TINT.amber}1F`,
            }}>
            <IconTile name="reorder" tint={TINT.amber} size={40} />
            <ThemedText type="small" style={{ flex: 1 }}>
              {reorderCount === 0
                ? t('receive.nothingLow')
                : t('receive.runningLow', { count: reorderCount })}
            </ThemedText>
          </View>
        )}

        {/* 1 · Supplier */}
        <View style={{ gap: Spacing.two }}>
          <StepLabel n={1}>{t('receive.whoDelivered')}</StepLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
            <Chip label={t('receive.noSupplier')} selected={supplierId === null} onPress={() => setSupplierId(null)} />
            {(suppliers.data ?? []).map((s) => (
              <Chip key={s.id} label={s.name} selected={supplierId === s.id} onPress={() => setSupplierId(s.id)} />
            ))}
            <Chip label={t('receive.newChip')} selected={false} onPress={() => router.push('/supplier-form')} />
          </ScrollView>
          {supplier && supplier.due > 0 && (
            <ThemedText type="caption" themeColor="textSecondary">
              {t('receive.alreadyOwe', { name: supplier.name, amount: formatCurrency(supplier.due) })}
            </ThemedText>
          )}
        </View>

        {/* 2 · Items */}
        <View style={{ gap: Spacing.two }}>
          <StepLabel n={2}>{t('receive.whatArrived')}</StepLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <SearchPill value={search} onChangeText={setSearch} placeholder={t('receive.searchPlaceholder')} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: scanning }}
              accessibilityLabel={scanning ? t('receive.hideCamera') : t('receive.scanBarcodes')}
              onPress={() => setScanning((v) => !v)}
              style={{
                width: 44,
                height: 44,
                borderRadius: Radius.md,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: scanning ? theme.primary : theme.backgroundElement,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
              }}>
              <Icon name="scan" size={22} color={scanning ? theme.onPrimary : theme.text} />
            </Pressable>
          </View>

          {scanning && <BarcodeScanner active={isFocused && !pickVariantOf} height={170} onScan={onScan} />}

          {notFound && (
            <Panel>
              <ThemedText type="smallBold">{t('receive.notInProducts', { code: notFound })}</ThemedText>
              <Button
                title={t('receive.addAsNew')}
                variant="secondary"
                onPress={() => {
                  setNotFound(null);
                  router.push({ pathname: '/new-product', params: { barcode: notFound } });
                }}
              />
            </Panel>
          )}

          {matches.length > 0 && (
            <Panel style={{ paddingVertical: Spacing.two }}>
              {matches.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('receive.addA11y', { name: p.name })}
                  onPress={() => {
                    addProduct(p);
                    setSearch('');
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.three,
                    paddingVertical: Spacing.one,
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <ProductThumb name={p.name} imageUrl={p.imageUrl} size={40} radius={10} />
                  <ThemedText style={{ flex: 1 }} numberOfLines={1}>
                    {p.name}
                  </ThemedText>
                  <ThemedText type="smallBold" themeColor="primary">
                    {t('receive.add')}
                  </ThemedText>
                </Pressable>
              ))}
            </Panel>
          )}

          {pickVariantOf && (
            <Panel icon="box" tint={TINT.indigo} title={t('receive.whichVariant', { name: pickVariantOf.name })}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                {pickVariantOf.variants.map((v) => (
                  <Chip
                    key={v.id}
                    label={v.name}
                    selected={false}
                    onPress={() => {
                      addVariant(pickVariantOf, v.id);
                      setPickVariantOf(null);
                    }}
                  />
                ))}
              </View>
            </Panel>
          )}
        </View>

        {lines.length === 0 && !pickVariantOf && matches.length === 0 && (
          <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four }}>
            <Icon name="box" size={34} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {t('receive.scanOrSearch')}
            </ThemedText>
          </View>
        )}

        {lines.map((l) => (
          <LineCard
            key={l.variantId}
            line={l}
            lineTotal={formatCurrency((toNumber(l.quantity) || 0) * (toNumber(l.unitCost) || 0))}
            onQuantity={(quantity) => updateLine(l.variantId, { quantity: quantity.replace(/\D/g, '') })}
            onCost={(unitCost) => updateLine(l.variantId, { unitCost })}
            onBump={(by) => bump(l, by)}
            onRemove={() => setLines((current) => current.filter((x) => x !== l))}
          />
        ))}

        {lines.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.one }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="small">{t('receive.updateCost')}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {t('receive.updateCostHint')}
              </ThemedText>
            </View>
            <Switch value={updateCost} onValueChange={setUpdateCost} trackColor={{ true: theme.primary }} accessibilityLabel={t('receive.updateCost')} />
          </View>
        )}

        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
      </ScrollView>

      {/* 3 · Pay + confirm */}
      <View
        style={{
          gap: Spacing.two + 2,
          padding: Spacing.three,
          paddingBottom: Spacing.three + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
          borderTopWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        }}>
        {lines.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <ThemedText type="caption" themeColor="textSecondary">
                {t('common.items', { count: lines.length })} · {t('common.units', { count: units })}
              </ThemedText>
              <ThemedText style={{ fontSize: 24, lineHeight: 30, fontWeight: 700, fontVariant: ['tabular-nums'] }}>
                {formatCurrency(total)}
              </ThemedText>
            </View>
            {supplierId && owed > 0 && (
              <ThemedText type="smallBold" themeColor="danger">
                {t('receive.owed', { amount: formatCurrency(owed) })}
              </ThemedText>
            )}
          </View>
        )}

        {lines.length > 0 && supplierId && (
          <>
            <Segmented
              options={[
                { value: 'full', label: t('receive.paidFull') },
                { value: 'part', label: t('receive.partPaid') },
                { value: 'later', label: t('receive.payLater') },
              ]}
              value={payment}
              onChange={setPayment}
            />
            {payment === 'part' && (
              <LabeledInput label={t('receive.amountPaidNow')} value={partAmount} onChangeText={setPartAmount} keyboardType="decimal-pad" />
            )}
            {paidAmount > 0 && <Segmented
                options={METHODS.map((value) => ({ value, label: t(`common.paymentMethods.${value}`) }))}
                value={method}
                onChange={setMethod}
              />}
          </>
        )}

        <Button
          title={lines.length ? t('receive.confirm') : t('receive.addItems')}
          onPress={save}
          loading={createPurchase.isPending}
          disabled={!linesValid || !paymentValid}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function StepLabel({ n, children }: { n: number; children: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${theme.primary}1A`,
        }}>
        <ThemedText type="caption" themeColor="primary" style={{ fontWeight: 700 }}>
          {n}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">{children}</ThemedText>
    </View>
  );
}

function SummaryLine({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <ThemedText type={bold ? 'smallBold' : 'small'} themeColor={bold ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" themeColor={danger ? 'danger' : 'text'} style={{ fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' }}>
        {value}
      </ThemedText>
    </View>
  );
}

/** One received item: photo, name, quantity stepper, cost each and the line total. */
function LineCard({
  line,
  lineTotal,
  onQuantity,
  onCost,
  onBump,
  onRemove,
}: {
  line: Line;
  lineTotal: string;
  onQuantity: (text: string) => void;
  onCost: (text: string) => void;
  onBump: (by: number) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const qty = toNumber(line.quantity) || 0;
  return (
    <Panel style={{ gap: Spacing.two + 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <ProductThumb name={line.name} imageUrl={line.imageUrl} size={48} radius={12} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {line.name}
          </ThemedText>
          {line.stock !== undefined && (
            <ThemedText type="caption" themeColor="textSecondary">
              {t('receive.stockAfter', { stock: line.stock, after: line.stock + qty })}
            </ThemedText>
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('receive.removeA11y', { name: line.name })} hitSlop={10} onPress={onRemove}>
          <Icon name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three }}>
        <View style={{ gap: 4 }}>
          <ThemedText type="caption" themeColor="textSecondary">
            {t('receive.quantity')}
          </ThemedText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: Radius.md,
              borderCurve: 'continuous',
              backgroundColor: theme.background,
            }}>
            <StepButton icon="minus" label={t('receive.less')} onPress={() => onBump(-1)} />
            <TextInput
              value={line.quantity}
              onChangeText={onQuantity}
              keyboardType="number-pad"
              selectTextOnFocus
              accessibilityLabel={t('receive.quantityOfA11y', { name: line.name })}
              style={{ width: 52, textAlign: 'center', fontSize: 17, fontWeight: 600, color: theme.text, paddingVertical: 10 }}
            />
            <StepButton icon="plus" label={t('receive.more')} onPress={() => onBump(1)} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <LabeledInput label={t('receive.costEach')} value={line.unitCost} onChangeText={onCost} keyboardType="decimal-pad" />
        </View>
        <View style={{ alignItems: 'flex-end', paddingBottom: 12, minWidth: 70 }}>
          <ThemedText type="caption" themeColor="textSecondary">
            {t('common.total')}
          </ThemedText>
          <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>
            {lineTotal}
          </ThemedText>
        </View>
      </View>
    </Panel>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ width: 40, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
      <Icon name={icon} size={18} color={theme.primary} weight="semibold" />
    </Pressable>
  );
}

function LabeledInput({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={label}
        style={{
          minHeight: 44,
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          paddingHorizontal: Spacing.three,
          fontSize: 16,
          color: theme.text,
          backgroundColor: theme.background,
        }}
        {...props}
      />
    </View>
  );
}
