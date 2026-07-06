/**
 * Status transition rules for Content Studio (spec §15, §22, 14.2).
 * Pure data + functions — enforced server-side in services, unit-tested.
 */

export type ReelScriptStatusValue =
  | 'DRAFT'
  | 'GENERATED'
  | 'UNDER_REVIEW'
  | 'EDITED'
  | 'APPROVED'
  | 'REJECTED'
  | 'READY_FOR_VIDEO'
  | 'ARCHIVED';

export type ContentItemStatusValue =
  | 'IDEA'
  | 'PLANNED'
  | 'SCRIPT_DRAFT'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'READY_FOR_VIDEO'
  | 'COMPLETED'
  | 'ARCHIVED';

export type ContentJobStatusValue =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

const SCRIPT_TRANSITIONS: Record<ReelScriptStatusValue, ReelScriptStatusValue[]> = {
  DRAFT: ['GENERATED', 'ARCHIVED'],
  GENERATED: ['UNDER_REVIEW', 'EDITED', 'APPROVED', 'REJECTED', 'ARCHIVED'],
  UNDER_REVIEW: ['EDITED', 'APPROVED', 'REJECTED', 'ARCHIVED'],
  EDITED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
  APPROVED: ['READY_FOR_VIDEO', 'EDITED', 'ARCHIVED'],
  REJECTED: ['EDITED', 'ARCHIVED'],
  READY_FOR_VIDEO: ['ARCHIVED'],
  ARCHIVED: [],
};

const ITEM_TRANSITIONS: Record<ContentItemStatusValue, ContentItemStatusValue[]> = {
  IDEA: ['PLANNED', 'ARCHIVED'],
  PLANNED: ['SCRIPT_DRAFT', 'ARCHIVED'],
  SCRIPT_DRAFT: ['WAITING_FOR_APPROVAL', 'ARCHIVED'],
  WAITING_FOR_APPROVAL: ['APPROVED', 'REJECTED', 'SCRIPT_DRAFT', 'ARCHIVED'],
  APPROVED: ['READY_FOR_VIDEO', 'ARCHIVED'],
  REJECTED: ['SCRIPT_DRAFT', 'ARCHIVED'],
  READY_FOR_VIDEO: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

const JOB_TRANSITIONS: Record<ContentJobStatusValue, ContentJobStatusValue[]> = {
  QUEUED: ['RUNNING', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'FAILED', 'QUEUED'],
  COMPLETED: [],
  FAILED: ['QUEUED'],
  CANCELLED: [],
};

export function canTransitionScript(
  from: ReelScriptStatusValue,
  to: ReelScriptStatusValue,
): boolean {
  return SCRIPT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionItem(
  from: ContentItemStatusValue,
  to: ContentItemStatusValue,
): boolean {
  return ITEM_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionJob(
  from: ContentJobStatusValue,
  to: ContentJobStatusValue,
): boolean {
  return JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Spec §22/§27: only approved scripts can be handed off to Video Studio. */
export function canHandOff(status: ReelScriptStatusValue): boolean {
  return status === 'APPROVED' || status === 'READY_FOR_VIDEO';
}
