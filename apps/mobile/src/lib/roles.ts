import type { Role } from '@/api/types';

/** Mirrors the API's role groups (apps/api/src/common/decorators.ts). */
export const canManage = (role: Role) => role === 'OWNER' || role === 'MANAGER';

export const canEditCatalog = (role: Role) => canManage(role) || role === 'INVENTORY_MANAGER';

