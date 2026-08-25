import { Router } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getAllSettings, listByTrack, listAll, listBy, UPLOAD_DIR } from '../store.js';
import { getHtb } from '../htb.js';

const router = Router();

const splitList = (s) =>
  (s || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

const withTags = (p) => ({ ...p, tagList: splitList(p.tags) });

export function buildViewModel() {
  const s = getAllSettings();
  return {
    s,
    heroSkills: splitList(s.hero_skills),
    secTags: splitList(s.sec_tags),
    devTags: splitList(s.dev_tags),
    security: {
      projects: listByTrack('projects', 'security').map(withTags),
      certs: listByTrack('certs', 'security'),
      experience: listByTrack('experience', 'security'),
    },
    fullstack: {
      projects: listByTrack('projects', 'fullstack').map(withTags),
      certs: listByTrack('certs', 'fullstack'),
      experience: listByTrack('experience', 'fullstack'),
    },
    otherExperience: listByTrack('experience', 'other'),
    academyCerts: listByTrack('certs', 'academy'),
    academyPaths: listAll('paths').map((p) => ({
      ...p,
      modules: listBy('path_modules', 'path_id', p.id),
    })),
    hasCv: !!s.cv_filename && existsSync(join(UPLOAD_DIR, s.cv_filename)),
    year: new Date().getFullYear(),
  };
}

router.get('/', async (req, res) => {
  const htb = await getHtb();
  res.render('portfolio', { ...buildViewModel(), htb });
});

router.get('/cv', (req, res) => {
  const name = getAllSettings().cv_filename;
  if (!name) return res.status(404).send('No CV uploaded yet.');
  const file = join(UPLOAD_DIR, name);
  if (!existsSync(file)) return res.status(404).send('CV file not found.');
  res.download(file, name);
});

export default router;
