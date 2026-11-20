import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCategories,
  useCreateCategory,
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useSetStock,
  useUpdateProduct,
} from '@/api/queries';
import type { ProductDetail, ProductKind } from '@/api/types';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { Button } from '@/components/button';
import { Chip, ChipGroup, Segmented } from '@/components/choice';
import { HeaderButton } from '@/components/header-button';
import { Icon } from '@/components/icon';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lineFor, useCart } from '@/lib/cart';
import { ApiError } from '@/lib/api-client';
import { pickProductPhoto, uploadProductPhoto, type PhotoSource } from '@/lib/product-photo';
import { useT } from '@/lib/i18n';
import { useBusinessType } from '@/lib/business';

/** Parse a typed amount; "" → undefined, junk → NaN. Accepts "1,250.50". */
const toNumber = (text: string) => (text.trim() === '' ? undefined : Number(text.replace(/,/g, '')));

type Photo =
  | { status: 'none' }
  | { status: 'uploading'; uri: string }
  | { status: 'ready'; uri: string; url: string }
  | { status: 'failed'; uri: string; reason: string };

/**
 * Add a product, or edit one (`?id=`). Photo, name, price and stock up front —
 * everything else is optional under "More details".
 *
 *   ?id=       edit this product (Delete in the header)
 *   ?barcode=  prefilled (opened from the scanner for an unknown code)
 *   ?name=     prefilled (opened from an empty search)
 *   ?addToCart=1  saving also adds it to the current sale
 */
export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useProduct(id);
  if (!id) return <ProductForm />;
  if (!query.data) return <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} />;
  return <ProductForm product={query.data} />;
}

function ProductForm({ product }: { product?: ProductDetail }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ barcode?: string; name?: string; addToCart?: string }>();
  const addToCart = params.addToCart === '1' && !product;
  const cart = useCart();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const setStockLevel = useSetStock();
  const deleteProduct = useDeleteProduct();
  const categories = useCategories();
  const createCategory = useCreateCategory();

  // Service shops add services by default; the switch shows wherever services are on.
  const businessType = useBusinessType();
  const [kind, setKind] = useState<ProductKind>(product?.kind ?? (businessType === 'SERVICE' ? 'SERVICE' : 'PRODUCT'));
  const showKind = businessType !== 'RETAIL' || product?.kind === 'SERVICE';
  const isService = kind === 'SERVICE';
  const [warranty, setWarranty] = useState(product?.warrantyDays ? String(product.warrantyDays) : '');
  const warrantyValue = toNumber(warranty);

  // Stock is edited here only for simple products (one hidden default variant); services have none.
  const defaultVariant = product?.variants.length === 1 && product.variants[0].isDefault ? product.variants[0] : undefined;
  const stockEditable = !isService && (!product || !!defaultVariant);
  const saving = createProduct.isPending || updateProduct.isPending || setStockLevel.isPending;

  const [photo, setPhoto] = useState<Photo>(
    product?.imageUrl ? { status: 'ready', uri: product.imageUrl, url: product.imageUrl } : { status: 'none' },
  );
  const [name, setName] = useState(product?.name ?? params.name ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [stock, setStock] = useState(defaultVariant ? String(defaultVariant.stock) : '');
  const [cost, setCost] = useState(product?.costPrice ? String(product.costPrice) : '');
  const [barcode, setBarcode] = useState(product?.barcode ?? params.barcode ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(product?.category?.id ?? null);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(!!params.barcode || !!product);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);
  // Ignore results of an upload the user has since replaced or removed.
  const uploadId = useRef(0);

  const priceValue = toNumber(price);
  const costValue = toNumber(cost);
  const stockValue = toNumber(stock);
  const valid =
    name.trim().length > 0 &&
    priceValue !== undefined &&
    !Number.isNaN(priceValue) &&
    priceValue >= 0 &&
    (costValue === undefined || (!Number.isNaN(costValue) && costValue >= 0)) &&
    (stockValue === undefined || Number.isInteger(stockValue)) &&
    (warrantyValue === undefined || (Number.isInteger(warrantyValue) && warrantyValue >= 0));
  const uploading = photo.status === 'uploading';

  const upload = async (uri: string) => {
    const id = ++uploadId.current;
    setPhoto({ status: 'uploading', uri });
    try {
      const url = await uploadProductPhoto(uri);
      if (id === uploadId.current) setPhoto({ status: 'ready', uri, url });
    } catch (e) {
      // Keep the real reason: "Upload failed" alone is impossible to act on.
      console.warn('Product photo upload failed', e, e instanceof ApiError ? e.details : undefined);
      const reason = e instanceof Error ? e.message : t('newProduct.unknownError');
      if (id === uploadId.current) setPhoto({ status: 'failed', uri, reason });
    }
  };

  const choosePhoto = async (source: PhotoSource) => {
    try {
      const uri = await pickProductPhoto(source);
      if (uri) void upload(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('newProduct.couldNotOpenPhoto'));
    }
  };

  const askPhotoSource = () => {
    // Web: Alert.alert shows nothing in a browser, so go straight to the file
    // picker (phone browsers offer camera or library there themselves).
    if (process.env.EXPO_OS === 'web') return void choosePhoto('library');
    const removable = photo.status !== 'none';
    if (process.env.EXPO_OS === 'ios') {
      const options = [
        t('newProduct.takePhoto'),
        t('newProduct.chooseLibrary'),
        ...(removable ? [t('newProduct.removePhoto')] : []),
        t('common.cancel'),
      ];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: removable ? 2 : undefined },
        (index) => {
          if (index === 0) void choosePhoto('camera');
          if (index === 1) void choosePhoto('library');
          if (removable && index === 2) removePhoto();
        },
      );
      return;
    }
    Alert.alert(t('newProduct.productPhoto'), undefined, [
      { text: t('newProduct.takePhoto'), onPress: () => void choosePhoto('camera') },
      { text: t('newProduct.chooseGallery'), onPress: () => void choosePhoto('library') },
      removable
        ? { text: t('common.remove'), style: 'destructive', onPress: removePhoto }
        : { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const removePhoto = () => {
    uploadId.current++;
    setPhoto({ status: 'none' });
  };

  const addCategory = async () => {
    const label = newCategory?.trim();
    if (!label) return;
    try {
      const created = await createCategory.mutateAsync({ name: label });
      setCategoryId(created.id);
      setNewCategory(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('categories.couldNotAdd'));
    }
  };

  const reset = () => {
    removePhoto();
    setName('');
    setPrice('');
    setStock('');
    setCost('');
    setBarcode('');
  };

  const saveChanges = async () => {
    if (!product || !valid || uploading || saving) return;
    setError(null);
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: name.trim(),
        price: priceValue!,
        costPrice: costValue ?? 0,
        barcode: barcode.trim() || undefined,
        categoryId: categoryId ?? undefined,
        imageUrl: photo.status === 'ready' ? photo.url : '',
        kind,
        warrantyDays: isService ? (warrantyValue ?? null) : undefined,
      });
      if (defaultVariant && stockValue !== undefined && stockValue !== defaultVariant.stock) {
        await setStockLevel.mutateAsync({ id: product.id, quantity: stockValue, note: t('productForm.stockNote') });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : t('newProduct.couldNotSave'));
    }
  };

  const confirmDelete = () => {
    if (!product) return;
    Alert.alert(t('productForm.deleteTitle'), t('productForm.deleteBody', { name: product.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct.mutateAsync(product.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.dismissTo('/products');
          } catch (e) {
            setError(e instanceof Error ? e.message : t('productForm.couldNotDelete'));
          }
        },
      },
    ]);
  };

  const save = async (next: 'close' | 'another') => {
    if (product) return saveChanges();
    if (!valid || uploading || createProduct.isPending) return;
    setError(null);
    try {
      const product = await createProduct.mutateAsync({
        name: name.trim(),
        price: priceValue!,
        costPrice: costValue,
        barcode: barcode.trim() || undefined,
        stock: isService ? 0 : (stockValue ?? 0),
        categoryId: categoryId ?? undefined,
        imageUrl: photo.status === 'ready' ? photo.url : undefined,
        kind,
        warrantyDays: isService ? warrantyValue : undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (addToCart) cart.add(lineFor(product, product.variants[0].id));
      if (next === 'another') {
        setSavedCount((n) => n + 1);
        reset();
        nameRef.current?.focus();
      } else {
        router.back();
      }
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : t('newProduct.couldNotSave'));
    }
  };

  const saveTitle = uploading
    ? t('newProduct.uploadingPhoto')
    : product
      ? t('common.save')
      : addToCart
        ? t('newProduct.saveAndAdd')
        : t('newProduct.saveProduct');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: product ? t('productForm.editTitle') : t('screens.newProduct'),
          headerRight: product
            ? () => <HeaderButton title={t('common.delete')} tone="danger" onPress={confirmDelete} />
            : undefined,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four }}>
        {savedCount > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Icon name="check" size={16} color={theme.success} />
            <ThemedText type="smallBold" themeColor="success">
              {t('productForm.addedNext', { count: savedCount })}
            </ThemedText>
          </View>
        )}

        {/* Photo */}
        <View style={{ alignItems: 'center' }}>
          <PhotoTile photo={photo} onPress={askPhotoSource} onRetry={() => photo.status === 'failed' && upload(photo.uri)} />
          {/* Web has no photo menu (see askPhotoSource), so removing gets its own link. */}
          {process.env.EXPO_OS === 'web' && photo.status !== 'none' && (
            <HeaderButton title={t('newProduct.removePhoto')} tone="danger" onPress={removePhoto} />
          )}
        </View>

        {showKind && (
          <Segmented
            options={[
              { value: 'PRODUCT' as ProductKind, label: t('productForm.kindProduct') },
              { value: 'SERVICE' as ProductKind, label: t('productForm.kindService') },
            ]}
            value={kind}
            onChange={setKind}
          />
        )}

        {/* Essentials */}
        <TextField
          ref={nameRef}
          label={t('newProduct.productName')}
          value={name}
          onChangeText={setName}
          placeholder={t('newProduct.namePlaceholder')}
          autoCapitalize="words"
          autoFocus={!!params.barcode || !!params.name}
          returnKeyType="next"
        />
        <View style={{ flexDirection: 'row', gap: Spacing.three }}>
          <View style={{ flex: 3 }}>
            <TextField
              label={t('newProduct.sellingPrice')}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              keyboardType="decimal-pad"
              style={{ fontSize: 20, fontWeight: 700 }}
            />
          </View>
          {isService && (
            <View style={{ flex: 2 }}>
              <TextField label={t('productForm.warrantyDays')} value={warranty} onChangeText={setWarranty} placeholder="0" keyboardType="number-pad" />
            </View>
          )}
          {stockEditable && (
            <View style={{ flex: 2 }}>
              <TextField label={t('newProduct.inStock')} value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" />
            </View>
          )}
        </View>
        {(product || isService) && (
          <ThemedText type="caption" themeColor="textSecondary" style={{ marginTop: -Spacing.two }}>
            {isService ? t('productForm.serviceHint') : stockEditable ? t('productForm.stockHint') : t('productForm.variantsHint')}
          </ThemedText>
        )}

        {/* Optional */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
          onPress={() => setShowMore((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one }}>
          <ThemedText type="smallBold" themeColor="primary" style={{ flex: 1 }}>
            {showMore ? t('newProduct.fewerDetails') : t('newProduct.moreDetails')}
            <ThemedText type="small" themeColor="textSecondary">
              {showMore ? '' : t('newProduct.moreHint')}
            </ThemedText>
          </ThemedText>
          <View style={{ transform: [{ rotate: showMore ? '180deg' : '0deg' }] }}>
            <Icon name="chevronDown" size={16} color={theme.primary} />
          </View>
        </Pressable>

        {showMore && (
          <View style={{ gap: Spacing.four }}>
            <TextField
              label={t('newProduct.costPrice')}
              value={cost}
              onChangeText={setCost}
              placeholder={t('newProduct.costPlaceholder')} keyboardType="decimal-pad" />

            {scanning ? (
              <View style={{ gap: Spacing.two }}>
                <BarcodeScanner
                  active
                  height={170}
                  onScan={(code) => {
                    void Haptics.selectionAsync();
                    setBarcode(code);
                    setScanning(false);
                  }}
                />
                <Button title={t('newProduct.cancelScan')} variant="secondary" onPress={() => setScanning(false)} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('newProduct.barcode')}
                    value={barcode}
                    onChangeText={setBarcode}
                    placeholder={t('newProduct.optional')} keyboardType="number-pad" />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('newProduct.scanBarcode')}
                  onPress={() => setScanning(true)}
                  style={({ pressed }) => ({
                    width: 50,
                    height: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: Radius.md,
                    borderCurve: 'continuous',
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                    borderWidth: 1,
                    borderColor: theme.border,
                  })}>
                  <Icon name="scan" size={22} color={theme.primary} />
                </Pressable>
              </View>
            )}

            <ChipGroup label={t('newProduct.category')}>
              {(categories.data ?? []).map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                />
              ))}
              {newCategory === null && <Chip label={t('newProduct.newChip')} selected={false} onPress={() => setNewCategory('')} />}
            </ChipGroup>
            {newCategory !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('newProduct.newCategory')}
                    value={newCategory}
                    onChangeText={setNewCategory}
                    placeholder={t('newProduct.categoryPlaceholder')}
                    autoFocus
                    autoCapitalize="words"
                    onSubmitEditing={addCategory}
                  />
                </View>
                <Button
                  title={t('common.add')}
                  variant="secondary"
                  onPress={addCategory}
                  loading={createCategory.isPending}
                  disabled={!newCategory.trim()}
                />
              </View>
            )}
          </View>
        )}

        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite" selectable>
            {error}
          </ThemedText>
        )}
      </ScrollView>

      <View
        style={{
          gap: Spacing.two,
          padding: Spacing.three,
          paddingBottom: Spacing.three + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
          borderTopWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        }}>
        <Button
          title={saveTitle}
          onPress={() => save('close')}
          loading={saving}
          disabled={!valid || uploading}
        />
        {!addToCart && !product && (
          <Button
            title={t('newProduct.saveAnother')}
            variant="secondary"
            onPress={() => save('another')}
            disabled={!valid || uploading || createProduct.isPending}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/** Big square photo target. Shows upload progress and a retry on failure. */
function PhotoTile({ photo, onPress, onRetry }: { photo: Photo; onPress: () => void; onRetry: () => void }) {
  const theme = useTheme();
  const t = useT();
  const size = 156;

  if (photo.status === 'none') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('newProduct.addPhotoA11y')}
        onPress={onPress}
        style={({ pressed }) => ({
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.two,
          borderRadius: 28,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: `${theme.primary}66`,
          backgroundColor: pressed ? `${theme.primary}1A` : `${theme.primary}0D`,
        })}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary,
            boxShadow: `0 6px 16px ${theme.primary}40`,
          }}>
          <Icon name="addPhoto" size={24} color={theme.onPrimary} />
        </View>
        <ThemedText type="smallBold" themeColor="primary">
          {t('newProduct.addPhoto')}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={photo.status === 'failed' ? t('newProduct.uploadFailedA11y') : t('newProduct.changePhoto')}
        onPress={photo.status === 'failed' ? onRetry : onPress}
        style={{
          width: size,
          height: size,
          borderRadius: 28,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: theme.backgroundSelected,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
        }}>
        <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        {photo.status !== 'ready' && (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.one,
              backgroundColor: photo.status === 'failed' ? 'rgba(239, 68, 68, 0.55)' : 'rgba(15, 23, 42, 0.35)',
            }}>
            {photo.status === 'uploading' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF', textAlign: 'center' }}>
                  {t('newProduct.uploadFailed')}
                </ThemedText>
                {photo.status === 'failed' && (
                  <ThemedText
                    type="caption"
                    numberOfLines={3}
                    style={{ color: '#FFFFFF', textAlign: 'center', paddingHorizontal: Spacing.two, opacity: 0.9 }}>
                    {photo.reason}
                  </ThemedText>
                )}
              </>
            )}
          </View>
        )}
      </Pressable>
      {/* Change/remove */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('newProduct.photoOptions')}
        onPress={onPress}
        hitSlop={8}
        style={{
          position: 'absolute',
          right: -6,
          bottom: -6,
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.backgroundElement,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
        }}>
        <Icon name="camera" size={17} color={theme.primary} />
      </Pressable>
    </View>
  );
}
