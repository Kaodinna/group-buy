export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomSlugSuffix(length = 6): string {
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return suffix;
}
