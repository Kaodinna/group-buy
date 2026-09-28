const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(firstName: string): string {
  const prefix = firstName.slice(0, 4).toUpperCase().padEnd(2, 'X');
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}${suffix}`;
}
