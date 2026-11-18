import type { JobStatus } from '@/api/types';
import { Badge } from '@/components/badge';
import { TINT } from '@/components/icon-tile';
import { useT } from '@/lib/i18n';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'textSecondary';

const TONE: Record<JobStatus, Tone> = {
  RECEIVED: 'textSecondary',
  DIAGNOSING: 'warning',
  WAITING_APPROVAL: 'warning',
  WAITING_PARTS: 'danger',
  IN_REPAIR: 'primary',
  READY: 'success',
  DELIVERED: 'textSecondary',
  CANCELLED: 'textSecondary',
};

/** Icon-tile tint per stage, for list rows. */
export const JOB_TINT: Record<JobStatus, string> = {
  RECEIVED: TINT.slate,
  DIAGNOSING: TINT.amber,
  WAITING_APPROVAL: TINT.amber,
  WAITING_PARTS: TINT.rose,
  IN_REPAIR: TINT.indigo,
  READY: TINT.emerald,
  DELIVERED: TINT.slate,
  CANCELLED: TINT.slate,
};

/** The usual next stage, offered as the main button on a job. */
export const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
  RECEIVED: 'DIAGNOSING',
  DIAGNOSING: 'IN_REPAIR',
  WAITING_APPROVAL: 'IN_REPAIR',
  WAITING_PARTS: 'IN_REPAIR',
  IN_REPAIR: 'READY',
};

/** Stages a job can be moved to by hand (DELIVERED comes from billing). */
export const MOVABLE: JobStatus[] = ['RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'WAITING_PARTS', 'IN_REPAIR', 'READY'];

export const isOpenJob = (status: JobStatus) => status !== 'DELIVERED' && status !== 'CANCELLED';

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const t = useT();
  return <Badge label={t(`jobStatus.${status}`)} tone={TONE[status]} />;
}
