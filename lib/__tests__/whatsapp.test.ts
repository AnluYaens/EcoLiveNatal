import { describe, expect, it } from 'vitest';
import { buildWhatsAppShareUrl, buildWhatsAppUrl } from '../whatsapp';

describe('whatsapp helpers', () => {
  it('normalizes numbers before building a direct chat URL', () => {
    expect(buildWhatsAppUrl('+54 9 11 1234-5678', 'Hola mundo')).toBe(
      'https://wa.me/5491112345678?text=Hola%20mundo',
    );
  });

  it('returns an empty string when no number can be derived', () => {
    expect(buildWhatsAppUrl('---', 'Hola')).toBe('');
  });

  it('builds a share URL without requiring a destination number', () => {
    expect(buildWhatsAppShareUrl('Resultado listo')).toBe(
      'https://wa.me/?text=Resultado%20listo',
    );
  });
});
