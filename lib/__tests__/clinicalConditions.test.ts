import { describe, expect, it } from 'vitest';
import {
  buildClinicalNotesPayload,
  getConditionsForRegion,
} from '../clinicalConditions';

describe('clinicalConditions', () => {
  it('returns region-specific conditions', () => {
    const heartConditions = getConditionsForRegion('heart');

    expect(heartConditions.length).toBeGreaterThan(0);
    expect(heartConditions.some((condition) => condition.id === 'fourChamberView')).toBe(true);
  });

  it('builds a payload with deduped known conditions and trimmed free text', () => {
    const payload = buildClinicalNotesPayload(
      ['vsd', 'vsd', 'asd'],
      '  Follow-up after prior scan  ',
    );

    expect(payload).toBe(
      'Known conditions: VSD (ventricular septal defect), ASD (atrial septal defect). Additional clinical notes: Follow-up after prior scan',
    );
  });

  it('omits empty sections cleanly', () => {
    expect(buildClinicalNotesPayload([], '   ')).toBe('');
    expect(buildClinicalNotesPayload(['omphalocele'], '   ')).toBe(
      'Known conditions: Omphalocele.',
    );
    expect(buildClinicalNotesPayload([], 'Short note')).toBe(
      'Additional clinical notes: Short note',
    );
  });

  it('ignores unknown condition ids instead of leaking them into the payload', () => {
    expect(buildClinicalNotesPayload(['missing-id'], 'note')).toBe(
      'Additional clinical notes: note',
    );
  });
});
