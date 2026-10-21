import fs from 'node:fs';
import path from 'node:path';

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(path.join(process.cwd(), '.env.local'));

const errors = [];
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_PASSWORD',
  'ADMIN_COOKIE_SECRET',
];

for (const key of required) {
  if (!process.env[key]?.trim()) errors.push(`${key} não configurada.`);
}

try {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  if (url.protocol !== 'https:') errors.push('NEXT_PUBLIC_SUPABASE_URL deve usar HTTPS.');
} catch {
  errors.push('NEXT_PUBLIC_SUPABASE_URL inválida.');
}

if ((process.env.ADMIN_PASSWORD || '').trim().length < 16) {
  errors.push('ADMIN_PASSWORD deve ter pelo menos 16 caracteres para produção.');
}

if ((process.env.ADMIN_COOKIE_SECRET || '').trim().length < 32) {
  errors.push('ADMIN_COOKIE_SECRET deve ter pelo menos 32 caracteres.');
}

if (process.env.APP_ORIGIN?.trim()) {
  try {
    const url = new URL(process.env.APP_ORIGIN.trim());
    if (url.protocol !== 'https:') errors.push('APP_ORIGIN deve usar HTTPS em produção.');
    if (url.pathname !== '/' || url.search || url.hash) errors.push('APP_ORIGIN deve conter apenas a origem, sem caminho, query ou hash.');
  } catch {
    errors.push('APP_ORIGIN inválida.');
  }
} else {
  errors.push('APP_ORIGIN deve ser configurada antes do lançamento.');
}

if (errors.length) {
  console.error('\nConfiguração incompleta:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Configuração básica OK. Nenhum segredo foi exibido.');
