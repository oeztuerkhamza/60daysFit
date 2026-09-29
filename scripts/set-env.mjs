#!/usr/bin/env node
/**
 * Generates src/environments/environment.ts from environment variables.
 *
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from process.env, falling back to a
 * local .env file so `npm start` works without exporting anything by hand.
 * The generated file is git-ignored — the anon key is a publishable key, but
 * keeping it out of the tree means every environment configures itself.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'src/environments/environment.ts');

/** Parses a minimal KEY=VALUE .env file. Quotes are stripped, `#` lines skipped. */
function readDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) out[key] = value;
  }
  return out;
}

const dotEnv = readDotEnv(resolve(root, '.env'));
const supabaseUrl = process.env['SUPABASE_URL'] ?? dotEnv['SUPABASE_URL'] ?? '';
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] ?? dotEnv['SUPABASE_ANON_KEY'] ?? '';
const production = process.env['NODE_ENV'] === 'production' || process.argv.includes('--prod');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[set-env] SUPABASE_URL / SUPABASE_ANON_KEY not set. Writing an empty config —\n' +
      '          the app will start but show a setup notice. Copy .env.example to .env.',
  );
}

const contents = `// GENERATED FILE — do not edit. Run \`npm run set-env\` to regenerate.
export const environment = {
  production: ${production},
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},
  challengeLengthDays: 60,
};
`;

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, contents, 'utf8');
console.log(`[set-env] wrote ${target.replace(root + '/', '')} (production=${production}, configured=${Boolean(supabaseUrl && supabaseAnonKey)})`);
