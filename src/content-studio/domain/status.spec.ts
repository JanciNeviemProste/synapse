import { describe, expect, it } from 'vitest';
import {
  canHandOff,
  canTransitionItem,
  canTransitionJob,
  canTransitionScript,
} from './status';

describe('ReelScript status transitions (spec §22)', () => {
  it('follows the happy path draft → generated → approved → ready_for_video', () => {
    expect(canTransitionScript('DRAFT', 'GENERATED')).toBe(true);
    expect(canTransitionScript('GENERATED', 'APPROVED')).toBe(true);
    expect(canTransitionScript('APPROVED', 'READY_FOR_VIDEO')).toBe(true);
  });

  it('never allows skipping approval to READY_FOR_VIDEO', () => {
    expect(canTransitionScript('DRAFT', 'READY_FOR_VIDEO')).toBe(false);
    expect(canTransitionScript('GENERATED', 'READY_FOR_VIDEO')).toBe(false);
    expect(canTransitionScript('EDITED', 'READY_FOR_VIDEO')).toBe(false);
    expect(canTransitionScript('REJECTED', 'READY_FOR_VIDEO')).toBe(false);
  });

  it('allows rejection to be revised', () => {
    expect(canTransitionScript('REJECTED', 'EDITED')).toBe(true);
  });

  it('archived is terminal', () => {
    expect(canTransitionScript('ARCHIVED', 'DRAFT')).toBe(false);
    expect(canTransitionScript('ARCHIVED', 'APPROVED')).toBe(false);
  });
});

describe('canHandOff (spec §27 — only approved scripts reach Video Studio)', () => {
  it('allows only APPROVED and READY_FOR_VIDEO', () => {
    expect(canHandOff('APPROVED')).toBe(true);
    expect(canHandOff('READY_FOR_VIDEO')).toBe(true);
    expect(canHandOff('DRAFT')).toBe(false);
    expect(canHandOff('GENERATED')).toBe(false);
    expect(canHandOff('EDITED')).toBe(false);
    expect(canHandOff('REJECTED')).toBe(false);
    expect(canHandOff('UNDER_REVIEW')).toBe(false);
    expect(canHandOff('ARCHIVED')).toBe(false);
  });
});

describe('ContentPlanItem status transitions (spec §15)', () => {
  it('follows idea → planned → script_draft → waiting → approved → ready → completed', () => {
    expect(canTransitionItem('IDEA', 'PLANNED')).toBe(true);
    expect(canTransitionItem('PLANNED', 'SCRIPT_DRAFT')).toBe(true);
    expect(canTransitionItem('SCRIPT_DRAFT', 'WAITING_FOR_APPROVAL')).toBe(true);
    expect(canTransitionItem('WAITING_FOR_APPROVAL', 'APPROVED')).toBe(true);
    expect(canTransitionItem('APPROVED', 'READY_FOR_VIDEO')).toBe(true);
    expect(canTransitionItem('READY_FOR_VIDEO', 'COMPLETED')).toBe(true);
  });

  it('blocks illegal jumps', () => {
    expect(canTransitionItem('IDEA', 'APPROVED')).toBe(false);
    expect(canTransitionItem('PLANNED', 'READY_FOR_VIDEO')).toBe(false);
  });
});

describe('ContentJob status transitions (spec 14.2)', () => {
  it('queued → running → completed/failed, failed can requeue', () => {
    expect(canTransitionJob('QUEUED', 'RUNNING')).toBe(true);
    expect(canTransitionJob('RUNNING', 'COMPLETED')).toBe(true);
    expect(canTransitionJob('RUNNING', 'FAILED')).toBe(true);
    expect(canTransitionJob('FAILED', 'QUEUED')).toBe(true);
    expect(canTransitionJob('COMPLETED', 'QUEUED')).toBe(false);
    expect(canTransitionJob('CANCELLED', 'RUNNING')).toBe(false);
  });
});
