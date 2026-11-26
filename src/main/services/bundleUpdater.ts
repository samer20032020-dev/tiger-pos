import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { UpdateCheckResult, UpdateProgressEvent } from '../../shared/types';

export function compareVersions(a: string, b: string): number {
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

export function getLiveUpdateDir(userDataDir: string): string {
  return path.join(userDataDir, 'live-update');
}

export function getLiveStagingDir(userDataDir: string): string {
  return path.join(userDataDir, 'live-update-staging');
}

function requestWithRedirects(
  url: string,
  headers: Record<string, string>,
  redirectsLeft = 6
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'TIGER-POS-Updater',
          ...headers,
        },
        timeout: 20000,
      },
      (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if ([301, 302, 303, 307, 308].includes(status) && location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects while fetching update'));
            return;
          }
          const nextUrl = new URL(location, url).toString();
          requestWithRedirects(nextUrl, headers, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        resolve(res);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('انتهت مهلة الاتصال بسيرفر التحديث'));
    });
    req.on('error', reject);
  });
}

export async function fetchGitHubJson<T = any>(url: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await requestWithRedirects(url, { Accept: 'application/vnd.github+json' });
  const status = res.statusCode || 0;
  const chunks: Buffer[] = [];
  for await (const chunk of res) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (status < 200 || status >= 300) {
    return { ok: false, status, data: null };
  }
  try {
    return { ok: true, status, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status, data: null };
  }
}

export async function downloadFileWithProgress(
  url: string,
  destPath: string,
  onProgress?: (downloadedBytes: number, totalBytes: number) => void
): Promise<{ size: number }> {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${destPath}.tmp`;
  if (fs.existsSync(tmpPath)) {
    try { fs.unlinkSync(tmpPath); } catch {}
  }

  const res = await requestWithRedirects(url, { Accept: 'application/octet-stream' });
  const status = res.statusCode || 0;
  if (status < 200 || status >= 300) {
    res.resume();
    throw new Error(`فشل تنزيل التحديث (HTTP ${status})`);
  }

  const totalBytes = parseInt(String(res.headers['content-length'] || '0'), 10) || 0;
  let downloadedBytes = 0;
  let lastEmit = 0;

  await new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(tmpPath);
    res.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      const now = Date.now();
      if (onProgress && (now - lastEmit >= 100 || (totalBytes > 0 && downloadedBytes >= totalBytes))) {
        lastEmit = now;
        onProgress(downloadedBytes, totalBytes);
      }
    });
    out.on('finish', () => {
      out.close(() => resolve());
    });
    res.on('error', (err) => {
      out.destroy();
      reject(err);
    });
    out.on('error', (err) => {
      res.destroy();
      reject(err);
    });
    res.pipe(out);
  });

  if (onProgress) {
    onProgress(downloadedBytes, totalBytes || downloadedBytes);
  }

  if (fs.existsSync(destPath)) {
    try { fs.unlinkSync(destPath); } catch {}
  }
  fs.renameSync(tmpPath, destPath);
  return { size: downloadedBytes };
}

export interface BundleFileEntry {
  path: string;
  size: number;
  sha256: string;
}

export interface BundleManifest {
  version: string;
  createdAt?: string;
  files?: BundleFileEntry[];
  installedAt?: string;
}

/**
 * Unpacks and cryptographically verifies a tiger-update.tpkg archive
 * into `stagingDir` (`userData/live-update-staging`).
 */
export function extractAndVerifyTpkg(tpkgPath: string, stagingDir: string, expectedVersion?: string): BundleManifest {
  const compressed = fs.readFileSync(tpkgPath);
  const raw = zlib.gunzipSync(compressed);

  if (raw.length < 9 || raw.subarray(0, 5).toString('ascii') !== 'TPKG1') {
    throw new Error('ملف الحزمة التحديثية غير صالح (صيغة تالفة)');
  }

  const metaLen = raw.readUInt32BE(5);
  if (9 + metaLen > raw.length) {
    throw new Error('رأس الحزمة التحديثية تالف');
  }

  const metaJson = raw.subarray(9, 9 + metaLen).toString('utf8');
  const meta = JSON.parse(metaJson) as BundleManifest;
  if (!meta.version || !Array.isArray(meta.files) || meta.files.length === 0) {
    throw new Error('بيانات الإصدار داخل حزمة التحديث غير مكتملة');
  }

  if (expectedVersion && compareVersions(meta.version, expectedVersion.replace(/^v/i, '')) !== 0) {
    throw new Error(`تعارض رقم الإصدار داخل الحزمة (${meta.version})`);
  }

  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  let offset = 9 + metaLen;
  for (const file of meta.files) {
    const normalized = String(file.path || '').replace(/\\/g, '/');
    if (
      !normalized ||
      normalized.includes('..') ||
      path.isAbsolute(normalized) ||
      (!normalized.startsWith('dist/') && !normalized.startsWith('dist-electron/'))
    ) {
      throw new Error(`مسار ملف غير مسموح في الحزمة: ${normalized}`);
    }

    if (offset + file.size > raw.length) {
      throw new Error(`بيانات الملف مبتورة: ${normalized}`);
    }

    const slice = raw.subarray(offset, offset + file.size);
    offset += file.size;

    const hash = crypto.createHash('sha256').update(slice).digest('hex');
    if (hash !== file.sha256) {
      throw new Error(`فشل فحص سلامة الملف: ${normalized}`);
    }

    const outPath = path.join(stagingDir, ...normalized.split('/'));
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outPath, slice);
  }

  const hasIndex = fs.existsSync(path.join(stagingDir, 'dist', 'index.html'));
  const hasMain = fs.existsSync(path.join(stagingDir, 'dist-electron', 'main', 'main.js'));
  if (!hasIndex || !hasMain) {
    throw new Error('حزمة التحديث تفتقد ملفات التشغيل الرئيسية');
  }

  const manifestToSave: BundleManifest = {
    version: meta.version.replace(/^v/i, ''),
    createdAt: meta.createdAt || new Date().toISOString(),
    installedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(stagingDir, 'manifest.json'), JSON.stringify(manifestToSave, null, 2), 'utf8');
  return manifestToSave;
}

export function promoteStagingToLive(userDataDir: string): BundleManifest | null {
  const stagingDir = getLiveStagingDir(userDataDir);
  const liveDir = getLiveUpdateDir(userDataDir);
  const stagingManifestPath = path.join(stagingDir, 'manifest.json');

  if (!fs.existsSync(stagingManifestPath)) {
    return null;
  }

  const manifest = JSON.parse(fs.readFileSync(stagingManifestPath, 'utf8')) as BundleManifest;
  const backupDir = path.join(userDataDir, 'live-update-prev');

  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  if (fs.existsSync(liveDir)) {
    fs.renameSync(liveDir, backupDir);
  }

  try {
    fs.renameSync(stagingDir, liveDir);
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    return manifest;
  } catch (err) {
    if (!fs.existsSync(liveDir) && fs.existsSync(backupDir)) {
      try { fs.renameSync(backupDir, liveDir); } catch {}
    }
    throw err;
  }
}

export async function checkLatestGitHubRelease(
  repo: string,
  currentVersion: string,
  fallbackNotes: string
): Promise<UpdateCheckResult> {
  const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
  const res = await fetchGitHubJson<any>(apiUrl);

  if (res.ok && res.data && res.data.tag_name) {
    const release = res.data;
    const latestVersion = String(release.tag_name).replace(/^v/i, '').trim();
    const assets: any[] = Array.isArray(release.assets) ? release.assets : [];

    const tpkgAsset = assets.find((a) => a.name === 'tiger-update.tpkg' && a.browser_download_url);
    const exeAsset = assets.find((a) => a.name === 'TIGER-Setup.exe' && a.browser_download_url);

    // Only report update ready if at least one downloadable artifact actually finished uploading
    const hasDownloadableAsset = Boolean(tpkgAsset || exeAsset);
    const hasUpdate = hasDownloadableAsset && compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseName: release.name || `إصدار الترقية السحابي TIGER v${latestVersion}`,
      releaseNotes: (release.body && String(release.body).trim()) || fallbackNotes,
      downloadUrl: exeAsset?.browser_download_url || `https://github.com/${repo}/releases/download/v${latestVersion}/TIGER-Setup.exe`,
      bundleDownloadUrl: tpkgAsset?.browser_download_url,
      bundleSize: tpkgAsset?.size,
      installerSize: exeAsset?.size,
      htmlUrl: release.html_url || `https://github.com/${repo}/releases`,
      publishedAt: release.published_at || new Date().toISOString(),
    };
  }

  // Fallback check via raw package.json only if GitHub API rate-limited
  const rawRes = await fetchGitHubJson<any>(`https://raw.githubusercontent.com/${repo}/main/package.json`);
  if (rawRes.ok && rawRes.data?.version) {
    const latestVersion = String(rawRes.data.version).replace(/^v/i, '').trim();
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseName: `إصدار الترقية السحابي TIGER v${latestVersion}`,
      releaseNotes: fallbackNotes,
      downloadUrl: `https://github.com/${repo}/releases/download/v${latestVersion}/TIGER-Setup.exe`,
      bundleDownloadUrl: `https://github.com/${repo}/releases/download/v${latestVersion}/tiger-update.tpkg`,
      htmlUrl: `https://github.com/${repo}/releases`,
      publishedAt: new Date().toISOString(),
    };
  }

  throw new Error('تعذر الاتصال بخادم التحديثات على GitHub حالياً');
}

export type ProgressCallback = (evt: UpdateProgressEvent) => void;
