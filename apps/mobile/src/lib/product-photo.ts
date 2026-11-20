import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { api } from '@/lib/api-client';

/** Product photos are shown at most ~400pt wide; 1080px keeps them crisp and small. */
const MAX_WIDTH = 1080;

export type PhotoSource = 'camera' | 'library';

/**
 * Let the user take or choose a square-ish product photo. Resolves the local,
 * compressed JPEG uri, or null if they cancel or deny permission.
 */
export async function pickProductPhoto(source: PhotoSource, maxWidth = MAX_WIDTH): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;

  // Phone cameras produce 3–8 MB files; shrink before it ever leaves the device.
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > maxWidth) context.resize({ width: maxWidth });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return saved.uri;
}

/**
 * Multipart body with the photo as `file`.
 *
 * Phones: since SDK 58 the global `fetch` is `expo/fetch`, which can't send React
 * Native's `{ uri, name, type }` file descriptors (it throws before the request
 * leaves the phone). An expo-file-system `File` works: it carries its name, MIME
 * type (from the .jpg extension the picker saves with) and bytes.
 *
 * Browser: expo-file-system has no web implementation (its `File` is a stub that
 * only warns), so the form got a plain object instead of an image and the API
 * answered "Attach an image". There the picked photo is a `blob:`/`data:` URL, so
 * read its bytes and attach a real browser File.
 */
async function photoForm(uri: string): Promise<FormData> {
  const form = new FormData();
  if (process.env.EXPO_OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const type = blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    const extension = type.split('/')[1].replace('jpeg', 'jpg');
    form.append('file', new globalThis.File([blob], `photo.${extension}`, { type }));
    return form;
  }
  form.append('file', new File(uri) as unknown as Blob);
  return form;
}

/** Upload a local photo through the API (stored on UploadThing); returns its URL. */
export async function uploadProductPhoto(uri: string): Promise<string> {
  const { url } = await api<{ url: string }>('/uploads/product-image', { method: 'POST', body: await photoForm(uri) });
  return url;
}

/** Profile photos show at most ~100pt, so 512px is plenty. */
export const AVATAR_WIDTH = 512;

/** Upload a local photo as the signed-in user's profile picture; returns its URL. */
export async function uploadAvatarPhoto(uri: string): Promise<string> {
  const { url } = await api<{ url: string }>('/uploads/avatar', { method: 'POST', body: await photoForm(uri) });
  return url;
}

export async function removeAvatarPhoto(): Promise<void> {
  await api('/uploads/avatar', { method: 'DELETE' });
}
