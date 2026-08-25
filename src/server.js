import 'dotenv/config';
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load, CONTENT_FILE } from './store.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

load(); // create content/portfolio.json from defaults on first run

const app = express();
const PORT = process.env.PORT || 3000;

// The /admin dashboard is a LOCAL editing tool — it is not part of the live site.
// Enabled by default for local dev; automatically OFF when NODE_ENV=production.
// Override explicitly with ADMIN_ENABLED=true|false.
const ADMIN_ENABLED =
  process.env.ADMIN_ENABLED != null
    ? process.env.ADMIN_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production';

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.locals.adminEnabled = ADMIN_ENABLED; // available to all views

app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(join(ROOT, 'public')));

app.use('/', publicRoutes);
if (ADMIN_ENABLED) app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`\n  Portfolio:   http://localhost:${PORT}`);
  if (ADMIN_ENABLED) {
    console.log(`  Dashboard:   http://localhost:${PORT}/admin  (local editing)`);
  } else {
    console.log(`  Dashboard:   OFF  (production / live mode — admin not served)`);
  }
  console.log(`  Content:     ${CONTENT_FILE}\n`);
});
