export function buildWhatsAppUrl(number: string, text: string): string {
  const normalizedNumber = number.replace(/\D/g, '');
  if (!normalizedNumber) {
    return '';
  }

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
