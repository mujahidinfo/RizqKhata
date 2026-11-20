import { useShop } from '@/api/queries';
import type { BusinessType } from '@/api/types';

/**
 * What the business does (Profile → Business type). Retail is the default, so
 * shops that never chose see the app exactly as before.
 */
export function useBusinessType(): BusinessType {
  return useShop().data?.businessType ?? 'RETAIL';
}

/** Modules to show for a business type. */
export function modulesFor(type: BusinessType) {
  return {
    /** Jobs board, job intake, services in the catalog. */
    services: type !== 'RETAIL',
    /** Stocked goods, receiving stock, reorder. */
    products: type !== 'SERVICE',
  };
}

export const useModules = () => modulesFor(useBusinessType());

/** Normalise a phone number for a WhatsApp link (Bangladesh: 01… → 8801…). */
export function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  return digits;
}
