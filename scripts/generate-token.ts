/**
 * Generate a UUID access token and store it in Redis.
 *
 * Usage:
 *   npx tsx scripts/generate-token.ts --name "Dr. García" --limit 50 --id dr-garcia
 *
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Redis } from '@upstash/redis';

// Load env file manually (avoid dotenv dependency)
for (const envPath of ['.env.local', '.env']) {
  try {
    const envFile = readFileSync(envPath, 'utf-8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
    break;
  } catch {
    // file not found — try next
  }
}

interface TokenArgs {
  name: string;
  id: string;
  limit: number;
}

function parseArgs(): TokenArgs {
  const args = process.argv.slice(2);
  let name = '';
  let id = '';
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
        name = args[++i] ?? '';
        break;
      case '--id':
        id = args[++i] ?? '';
        break;
      case '--limit':
        limit = parseInt(args[++i] ?? '50', 10);
        break;
    }
  }

  if (!name || !id) {
    console.error('Usage: npx tsx scripts/generate-token.ts --name "Dr. García" --limit 50 --id dr-garcia');
    process.exit(1);
  }

  return { name, id, limit };
}

async function main() {
  const { name, id, limit } = parseArgs();

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env.local');
    process.exit(1);
  }

  const redis = new Redis({ url, token });
  const uuid = randomUUID();
  const redisKey = `ecln:token:${uuid}`;

  await redis.set(redisKey, JSON.stringify({ id, name, dailyLimit: limit }));

  console.log('');
  console.log('TOKEN GENERADO EXITOSAMENTE');
  console.log('──────────────────────────────────────────');
  console.log(`  Nombre:  ${name}`);
  console.log(`  ID:      ${id}`);
  console.log(`  Límite:  ${limit} generaciones/día`);
  console.log(`  Token:   ${uuid}`);
  console.log('──────────────────────────────────────────');
  console.log('');
  console.log('Envía este token al doctor por WhatsApp.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
