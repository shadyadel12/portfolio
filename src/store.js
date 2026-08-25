import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
export const CONTENT_DIR = join(ROOT, 'content');
export const CONTENT_FILE = join(CONTENT_DIR, 'portfolio.json');
export const UPLOAD_DIR = join(ROOT, 'uploads');

// ---- default content (mirrors the imported design) --------------------------
const DEFAULTS = {
  settings: {
    brand: 'your-name',
    name: 'Your Name',
    role: 'Cybersecurity Student & Full-Stack Developer',
    hero_intro:
      'One or two lines about who you are. Replace this placeholder with your own intro — a security-minded developer who builds full-stack apps and studies how they break.',
    hero_skills: 'Python, JavaScript, Bash, Linux',
    about:
      'A short paragraph about you — who you are, what you are studying, and what you like to build and secure. Replace this placeholder with your own story.',
    email: 'your.email@example.com',
    github_url: '',
    linkedin_url: '',
    sec_intro:
      'A short intro to your security work — for example penetration testing, CTFs, blue-team defense, or secure code review. Replace this placeholder.',
    sec_tags: 'Pen testing, CTFs, Network security, OSINT, Nmap, Wireshark, Burp Suite',
    dev_intro:
      'A short intro to your development work — the kind of apps you build, front to back. Replace this placeholder with your own words.',
    dev_tags: 'React, TypeScript, Node, Python, Flask, PostgreSQL, Docker',
    other_intro: 'Roles and work outside cybersecurity and development.',
    htb_intro: 'Live from my Hack The Box profile — rank, points, and the machines I have owned.',
    academy_intro: 'My structured learning on HTB Academy — modules, tier, and certifications.',
    academy_tier: '',
    academy_modules: '',
    academy_cubes: '',
    academy_url: '',
    cv_filename: '',
  },
  projects: [
    { id: 1, track: 'security', code: './sec-01', title: 'Project Name', description: 'One line about this security project. Replace with your real work.', tags: 'Python, Nmap', url: '', sort_order: 1 },
    { id: 2, track: 'security', code: './sec-02', title: 'Project Name', description: 'One line about this security project. Replace with your real work.', tags: 'Bash, Linux', url: '', sort_order: 2 },
    { id: 3, track: 'fullstack', code: './dev-01', title: 'Project Name', description: 'One line about this app. Replace with your real project.', tags: 'React, Node', url: '', sort_order: 1 },
    { id: 4, track: 'fullstack', code: './dev-02', title: 'Project Name', description: 'One line about this app. Replace with your real project.', tags: 'Python, Flask', url: '', sort_order: 2 },
  ],
  certs: [
    { id: 1, track: 'security', title: 'CompTIA Security+', credential: 'Credential ID — replace', year: '2025', sort_order: 1 },
    { id: 2, track: 'security', title: 'Certified Ethical Hacker (CEH)', credential: 'Credential ID — replace', year: '2025', sort_order: 2 },
    { id: 3, track: 'fullstack', title: 'Meta Front-End Developer', credential: 'Credential ID — replace', year: '2025', sort_order: 1 },
    { id: 4, track: 'fullstack', title: 'AWS Certified Developer', credential: 'Credential ID — replace', year: '2024', sort_order: 2 },
  ],
  experience: [
    { id: 1, track: 'security', role: 'Security Analyst Intern', org: 'Company Name', description: 'One line on what you did. Replace with your real experience.', period: '2024 — 2025', sort_order: 1 },
    { id: 2, track: 'security', role: 'CTF Team Member', org: 'Team / Club', description: 'One line on your role and results. Replace this placeholder.', period: '2023 — now', sort_order: 2 },
    { id: 3, track: 'fullstack', role: 'Full-Stack Developer', org: 'Company Name', description: 'One line on what you built. Replace with your real experience.', period: '2024 — now', sort_order: 1 },
    { id: 4, track: 'fullstack', role: 'Freelance Web Developer', org: 'Self-employed', description: 'One line on your clients and stack. Replace this placeholder.', period: '2023 — 2024', sort_order: 2 },
  ],
  paths: [],
  path_modules: [],
};

// ---- load / save ------------------------------------------------------------
let cache = null;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function load() {
  if (cache) return cache;
  mkdirSync(CONTENT_DIR, { recursive: true });
  mkdirSync(UPLOAD_DIR, { recursive: true });

  if (!existsSync(CONTENT_FILE)) {
    cache = clone(DEFAULTS);
    persist();
    console.log(`[store] Created ${CONTENT_FILE} from defaults.`);
    return cache;
  }

  try {
    const raw = JSON.parse(readFileSync(CONTENT_FILE, 'utf8'));
    // merge so any newly-added setting keys get sensible defaults
    cache = {
      settings: { ...DEFAULTS.settings, ...(raw.settings || {}) },
      projects: raw.projects || [],
      certs: raw.certs || [],
      experience: raw.experience || [],
      paths: raw.paths || [],
      path_modules: raw.path_modules || [],
    };
  } catch (err) {
    console.error(`[store] Could not parse ${CONTENT_FILE}: ${err.message}. Using defaults.`);
    cache = clone(DEFAULTS);
  }
  return cache;
}

function persist() {
  // atomic-ish write: write to temp then rename
  const tmp = CONTENT_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  renameSync(tmp, CONTENT_FILE);
}

// ---- settings ---------------------------------------------------------------
export function getAllSettings() {
  return { ...load().settings };
}

export function getSetting(key, fallback = '') {
  const v = load().settings[key];
  return v == null ? fallback : v;
}

export function setSetting(key, value) {
  load().settings[key] = value == null ? '' : String(value);
  persist();
}

// ---- collections ------------------------------------------------------------
const COLLECTIONS = new Set(['projects', 'certs', 'experience', 'paths', 'path_modules']);

function coll(name) {
  if (!COLLECTIONS.has(name)) throw new Error(`Unknown collection: ${name}`);
  return load()[name];
}

const bySort = (a, b) => a.sort_order - b.sort_order || a.id - b.id;

export function listByTrack(name, track) {
  return coll(name).filter((r) => r.track === track).sort(bySort);
}

export function listAll(name) {
  return coll(name).slice().sort(bySort);
}

export function listBy(name, key, value) {
  return coll(name).filter((r) => r[key] === value).sort(bySort);
}

function nextId(list) {
  return list.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
}

export function createItem(name, fields) {
  const list = coll(name);
  const item = { id: nextId(list), ...fields };
  list.push(item);
  persist();
  return item;
}

export function updateItem(name, id, fields) {
  const list = coll(name);
  const item = list.find((r) => r.id === id);
  if (!item) return false;
  Object.assign(item, fields);
  persist();
  return true;
}

export function deleteItem(name, id) {
  const data = load();
  const before = data[name].length;
  data[name] = data[name].filter((r) => r.id !== id);
  const removed = data[name].length < before;
  if (removed) persist();
  return removed;
}
