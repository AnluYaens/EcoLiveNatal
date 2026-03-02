const DECORATIVE_EMOJI_REGEX = /[✨⬇️💬🔄🗑]/g;

export function stripDecorativeEmoji(text: string): string {
  return text
    .replace(DECORATIVE_EMOJI_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
