import { Router } from 'express';
import multer from 'multer';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  getAllSettings,
  getSetting,
  setSetting,
  listByTrack,
  listAll,
  listBy,
  createItem,
  updateItem,
  deleteItem,
  UPLOAD_DIR,
} from '../store.js';
import { htbConfigured, htbEnabled, clearHtbCache } from '../htb.js';

const router = Router();

// ---- CV upload config -------------------------------------------------------
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, 'cv.pdf'),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    cb(ok ? null : new Error('Only PDF files are allowed.'), ok);
  },
});

const redir = (res, msg, type = 'ok', hash = '') =>
  res.redirect(`/admin?msg=${encodeURIComponent(msg)}&type=${type}${hash}`);

const TRACKS = new Set(['security', 'fullstack', 'other', 'academy']);
const cleanTrack = (t) => (TRACKS.has(t) ? t : 'security');
const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

// ---- dashboard --------------------------------------------------------------
router.get('/', (req, res) => {
  const s = getAllSettings();
  res.render('admin/dashboard', {
    s,
    hasCv: !!s.cv_filename && existsSync(join(UPLOAD_DIR, s.cv_filename)),
    data: {
      security: {
        projects: listByTrack('projects', 'security'),
        certs: listByTrack('certs', 'security'),
        experience: listByTrack('experience', 'security'),
      },
      fullstack: {
        projects: listByTrack('projects', 'fullstack'),
        certs: listByTrack('certs', 'fullstack'),
        experience: listByTrack('experience', 'fullstack'),
      },
      other: {
        experience: listByTrack('experience', 'other'),
      },
      academy: {
        certs: listByTrack('certs', 'academy'),
      },
      paths: listAll('paths').map((p) => ({ ...p, modules: listBy('path_modules', 'path_id', p.id) })),
    },
    htbConfigured: htbConfigured(),
    htbEnabled: htbEnabled(),
    msg: req.query.msg || null,
    msgType: req.query.type === 'err' ? 'err' : 'ok',
  });
});

// ---- HTB ---------------------------------------------------------------------
router.post('/htb/refresh', (req, res) => {
  clearHtbCache();
  redir(res, 'HTB data will refresh on next page load.', 'ok', '#htb');
});

// ---- text settings ----------------------------------------------------------
const SETTING_KEYS = [
  'brand', 'name', 'role', 'hero_intro', 'hero_skills', 'about',
  'email', 'github_url', 'linkedin_url',
  'sec_intro', 'sec_tags', 'dev_intro', 'dev_tags', 'other_intro', 'htb_intro',
  'academy_intro', 'academy_tier', 'academy_modules', 'academy_cubes', 'academy_url',
];

router.post('/settings', (req, res) => {
  for (const key of SETTING_KEYS) {
    if (key in req.body) setSetting(key, req.body[key]);
  }
  redir(res, 'Content saved.', 'ok', '#content');
});

// ---- CV ---------------------------------------------------------------------
router.post('/cv', (req, res) => {
  upload.single('cv')(req, res, (err) => {
    if (err) return redir(res, err.message, 'err', '#cv');
    if (!req.file) return redir(res, 'No file selected.', 'err', '#cv');
    setSetting('cv_filename', 'cv.pdf');
    redir(res, 'CV uploaded.', 'ok', '#cv');
  });
});

router.post('/cv/delete', (req, res) => {
  const name = getSetting('cv_filename');
  if (name) {
    const file = join(UPLOAD_DIR, name);
    if (existsSync(file)) unlinkSync(file);
  }
  setSetting('cv_filename', '');
  redir(res, 'CV removed.', 'ok', '#cv');
});

const clampPct = (v) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10)); // one decimal, 0..100
};

// ---- generic CRUD factory ---------------------------------------------------
// `build(body)` returns the record to store, so each collection controls its own
// field parsing (track / numbers / percentages / foreign keys).
function crud({ name, hash, label, build, onDelete }) {
  router.post(`/${name}`, (req, res) => {
    createItem(name, build(req.body));
    redir(res, `${label} added.`, 'ok', hash);
  });

  router.post(`/${name}/:id`, (req, res) => {
    updateItem(name, toInt(req.params.id), build(req.body));
    redir(res, `${label} updated.`, 'ok', hash);
  });

  router.post(`/${name}/:id/delete`, (req, res) => {
    const id = toInt(req.params.id);
    deleteItem(name, id);
    if (onDelete) onDelete(id);
    redir(res, `${label} deleted.`, 'ok', hash);
  });
}

const str = (b, f) => b[f] ?? '';

crud({
  name: 'projects', hash: '#projects', label: 'Project',
  build: (b) => ({ track: cleanTrack(b.track), code: str(b, 'code'), title: str(b, 'title'), description: str(b, 'description'), tags: str(b, 'tags'), url: str(b, 'url'), sort_order: toInt(b.sort_order) }),
});
crud({
  name: 'certs', hash: '#certs', label: 'Certification',
  build: (b) => ({ track: cleanTrack(b.track), title: str(b, 'title'), credential: str(b, 'credential'), year: str(b, 'year'), sort_order: toInt(b.sort_order) }),
});
crud({
  name: 'experience', hash: '#experience', label: 'Experience',
  build: (b) => ({ track: cleanTrack(b.track), role: str(b, 'role'), org: str(b, 'org'), description: str(b, 'description'), period: str(b, 'period'), sort_order: toInt(b.sort_order) }),
});
crud({
  name: 'paths', hash: '#paths', label: 'Path',
  build: (b) => ({ name: str(b, 'name'), tag: str(b, 'tag'), difficulty: str(b, 'difficulty'), modules_total: str(b, 'modules_total'), hours: str(b, 'hours'), progress: clampPct(b.progress), url: str(b, 'url'), sort_order: toInt(b.sort_order) }),
  onDelete: (id) => {
    // cascade: remove the modules belonging to this path
    for (const m of listBy('path_modules', 'path_id', id)) deleteItem('path_modules', m.id);
  },
});
crud({
  name: 'path_modules', hash: '#paths', label: 'Module',
  build: (b) => ({ path_id: toInt(b.path_id), name: str(b, 'name'), status: str(b, 'status'), progress: clampPct(b.progress), sort_order: toInt(b.sort_order) }),
});

export default router;
