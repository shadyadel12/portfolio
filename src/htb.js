// Hack The Box auto-sync.
// Reads a personal HTB App Token from the environment and pulls live profile
// stats + recent owns. Results are cached in memory so we never hammer the API.
//
// Required env:  HTB_TOKEN         (create at HTB → Profile → App Tokens)
// Optional env:  HTB_USER_ID       (numeric; auto-resolved from the token if omitted)
//                HTB_API_BASE      (default https://labs.hackthebox.com/api/v4)
//                HTB_CACHE_MINUTES (default 15)

const BASE = (process.env.HTB_API_BASE || 'https://labs.hackthebox.com/api/v4').replace(/\/$/, '');
const TOKEN = process.env.HTB_TOKEN || '';
// Set HTB_ENABLED=false to hide the Labs section without removing the token.
const ENABLED = process.env.HTB_ENABLED !== 'false';
const AVATAR_HOST = 'https://labs.hackthebox.com';
const TTL = (parseInt(process.env.HTB_CACHE_MINUTES, 10) || 15) * 60 * 1000;

let userId = process.env.HTB_USER_ID || '';
let cache = { at: 0, data: null };

export function htbConfigured() {
  return !!TOKEN;
}

export function htbEnabled() {
  return ENABLED;
}

async function api(path) {
  const res = await fetch(BASE + path, {
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/json',
      'User-Agent': 'portfolio-site',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTB ${path} -> HTTP ${res.status}`);
  return res.json();
}

// tolerate the API returning a value under any of several likely keys
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return undefined;
}

function absAvatar(a) {
  if (!a) return '';
  return a.startsWith('http') ? a : AVATAR_HOST + a;
}

async function resolveUserId() {
  if (userId) return userId;
  const info = await api('/user/info');
  userId = String(pick(info?.info || info, 'id') ?? '');
  if (!userId) throw new Error('Could not resolve HTB user id from token');
  return userId;
}

export async function getHtb() {
  if (!ENABLED || !TOKEN) return { configured: false };

  const now = Date.now();
  if (cache.data && now - cache.at < TTL) return cache.data;

  try {
    const id = await resolveUserId();
    const [p, c] = await Promise.all([
      api('/user/profile/basic/' + id),
      api('/user/profile/content/' + id).catch(() => ({})),
    ]);

    const prof = p.profile || p;
    const machinesRaw = c?.profile?.content?.machines || [];

    const progress = Number(pick(prof, 'current_rank_progress'));

    const data = {
      configured: true,
      ok: true,
      profileUrl: 'https://app.hackthebox.com/profile/' + id,
      profile: {
        name: pick(prof, 'name'),
        fullName: pick(prof, 'full_name'),
        avatar: absAvatar(pick(prof, 'avatar')),
        rank: pick(prof, 'rank'),
        nextRank: pick(prof, 'next_rank'),
        rankProgress: Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : null,
        ranking: pick(prof, 'ranking'),
        points: pick(prof, 'points'),
        userOwns: pick(prof, 'user_owns'),
        systemOwns: pick(prof, 'system_owns'),
        respects: pick(prof, 'respects'),
        country: pick(prof, 'country_name'),
      },
      machines: (Array.isArray(machinesRaw) ? machinesRaw : []).slice(0, 8).map((m) => ({
        name: pick(m, 'name'),
        os: pick(m, 'os'),
        difficulty: pick(m, 'difficulty', 'difficultyText'),
        points: pick(m, 'points'),
      })),
      fetchedAt: now,
    };

    cache = { at: now, data };
    return data;
  } catch (err) {
    const data = {
      configured: true,
      ok: false,
      error: err.message,
      profileUrl: userId ? 'https://app.hackthebox.com/users/' + userId : 'https://app.hackthebox.com',
    };
    // short-cache errors (1 min) so a transient failure doesn't retry every request
    cache = { at: now - TTL + 60 * 1000, data };
    return data;
  }
}

export function clearHtbCache() {
  cache = { at: 0, data: null };
}
