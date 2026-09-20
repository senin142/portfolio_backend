// A small denylist of the most common passwords worldwide (publicly known,
// e.g. from annual "most common passwords" breach-analysis reports) -- not
// exhaustive, just enough to stop the laziest signups. Checked case-insensitively.
export const COMMON_PASSWORDS = new Set([
  '123456', '123456789', '12345678', '12345', '1234567', '1234567890', '111111',
  '000000', 'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', 'password', 'password1',
  'password123', 'letmein', 'welcome', 'welcome1', 'admin', 'admin123', 'iloveyou',
  'monkey', 'dragon', 'football', 'baseball', 'basketball', 'superman', 'batman',
  'trustno1', 'sunshine', 'princess', 'starwars', 'master', 'shadow', 'michael',
  'jennifer', 'jordan23', 'letme1n', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'changeme',
  'change123', 'freedom', 'whatever', 'qazwsx', '1qaz2wsx', 'zaq12wsx', 'aaaaaa',
  'access', 'flower', 'hello123', 'login123', 'guest123', 'test1234', '87654321',
  'newpassword', 'temppass', 'temp1234', 'default', 'default123',
]);

export function isCommonPassword(value: string): boolean {
  return COMMON_PASSWORDS.has(value.trim().toLowerCase());
}
