import { describe, expect, it } from 'vitest';
import { stripDecorativeEmoji } from '../stripDecorativeEmoji';

describe('stripDecorativeEmoji', () => {
  it('removes decorative action emoji and trims extra spaces', () => {
    expect(stripDecorativeEmoji('✨ Guardar  💬  resultado ⬇️')).toBe(
      'Guardar resultado',
    );
  });

  it('leaves plain text untouched', () => {
    expect(stripDecorativeEmoji('Nuevo retrato')).toBe('Nuevo retrato');
  });
});
