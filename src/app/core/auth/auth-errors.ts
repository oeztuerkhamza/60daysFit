/** Maps the Supabase auth errors users actually hit onto Turkish copy. */
const MESSAGES: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid login credentials/i, 'E-posta veya şifre hatalı.'],
  [/email not confirmed/i, 'E-posta adresini onaylaman gerekiyor. Gelen kutunu kontrol et.'],
  [/user already registered|already been registered/i, 'Bu e-posta ile zaten bir hesap var.'],
  [/password should be at least/i, 'Şifre en az 6 karakter olmalı.'],
  [/rate limit|too many requests/i, 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.'],
  [/unable to validate email|invalid email/i, 'Geçerli bir e-posta adresi gir.'],
  [/failed to fetch|network/i, 'Sunucuya ulaşılamadı. Bağlantını kontrol et.'],
];

export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  for (const [pattern, message] of MESSAGES) {
    if (pattern.test(raw)) return message;
  }
  return raw || 'Beklenmeyen bir hata oluştu.';
}
