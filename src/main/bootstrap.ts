import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

function compareVersions(a: string, b: string): number {
  const cleanA = (a || '').replace(/^v/i, '');
  const cleanB = (b || '').replace(/^v/i, '');
  const pa = cleanA.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = cleanB.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function bootFromLiveBundleIfNewer(): boolean {
  if (!app.isPackaged || process.env.ELECTRON_IS_DEV === '1') {
    return false;
  }

  try {
    const userDataDir = app.getPath('userData');
    const liveDir = path.join(userDataDir, 'live-update');
    const manifestPath = path.join(liveDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return false;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const baseVersion = app.getVersion();

    // If installed EXE is newer or equal, clean up old live-update cache cleanly
    if (!manifest?.version || compareVersions(manifest.version, baseVersion) <= 0) {
      try { fs.rmSync(liveDir, { recursive: true, force: true }); } catch {}
      return false;
    }

    const liveMainPath = path.join(liveDir, 'dist-electron', 'main', 'main.js');
    const liveIndexPath = path.join(liveDir, 'dist', 'index.html');
    if (!fs.existsSync(liveMainPath) || !fs.existsSync(liveIndexPath)) {
      return false;
    }

    // Allow code running from userData/live-update to require third-party packages
    // bundled inside app.asar/node_modules (e.g. sql.js, exceljs)
    const Module = require('module');
    const bundledRoot = path.join(__dirname, '../..');
    const bundledPaths: string[] = Module._nodeModulePaths(bundledRoot);
    const origResolveFilename = Module._resolveFilename;
    if (!(origResolveFilename as any).__tigerPatched) {
      const patchedResolve = function (this: any, request: string, parent: any, isMain: boolean, options: any) {
        try {
          return origResolveFilename.call(this, request, parent, isMain, options);
        } catch (err: any) {
          if (err?.code === 'MODULE_NOT_FOUND' && !request.startsWith('.') && !path.isAbsolute(request)) {
            const fallbackParent = {
              id: __filename,
              filename: __filename,
              paths: bundledPaths,
            };
            return origResolveFilename.call(this, request, fallbackParent, false, options);
          }
          throw err;
        }
      };
      (patchedResolve as any).__tigerPatched = true;
      Module._resolveFilename = patchedResolve;
    }

    process.env.TIGER_LIVE_VERSION = String(manifest.version).replace(/^v/i, '');
    require(liveMainPath);
    return true;
  } catch (err) {
    console.error('[Bootstrap] Live bundle failed, reverting to built-in version:', err);
    try {
      delete process.env.TIGER_LIVE_VERSION;
      const liveDir = path.join(app.getPath('userData'), 'live-update');
      if (fs.existsSync(liveDir)) {
        fs.rmSync(liveDir, { recursive: true, force: true });
      }
    } catch {}
    return false;
  }
}

if (!bootFromLiveBundleIfNewer()) {
  require('./main');
}
