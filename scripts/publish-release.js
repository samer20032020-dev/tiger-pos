const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { packAppBundle } = require('./pack-update-bundle');

function getGitHubToken() {
  try {
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8'
    });
    const match = creds.match(/password=([^\r\n]+)/);
    if (match) return match[1].trim();
  } catch {}
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

const projectRoot = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = `v${pkg.version}`;
const owner = 'samer20032020-dev';
const repo = 'tiger-pos';
const token = getGitHubToken();

if (!token) {
  console.error('❌ No GitHub token found!');
  process.exit(1);
}

const setupPath = path.join(projectRoot, 'release', 'TIGER-Setup.exe');
if (!fs.existsSync(setupPath)) {
  console.error('❌ Installer file not found at:', setupPath);
  process.exit(1);
}

const tpkgPath = path.join(projectRoot, 'release', 'tiger-update.tpkg');
const packResult = packAppBundle(projectRoot, tpkgPath, pkg.version);
const setupStats = fs.statSync(setupPath);
console.log(
  `📦 Fast Bundle tiger-update.tpkg ready: ${(packResult.compressedBytes / 1024).toFixed(1)} KB ` +
  `(${packResult.fileCount} files, uncompressed ${(packResult.rawBytes / (1024 * 1024)).toFixed(2)} MB)`
);
console.log(`📦 Full Installer TIGER-Setup.exe size: ${(setupStats.size / (1024 * 1024)).toFixed(2)} MB`);

function getReleaseNotesBody() {
  if (process.env.RELEASE_NOTES && process.env.RELEASE_NOTES.trim()) {
    return process.env.RELEASE_NOTES.trim();
  }
  try {
    const mainSrc = fs.readFileSync(path.join(projectRoot, 'src', 'main', 'main.ts'), 'utf8');
    const match = mainSrc.match(/let\s+releaseNotes\s*=\s*['"`]([^'"`]+)['"`]/);
    if (match && match[1]) return match[1].trim();
  } catch {}
  return `تحديث TIGER SYSTEM ${version} لتحسين الأداء والاستقرار.`;
}

function apiRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

function uploadReleaseAsset(release, assetName, filePath) {
  return new Promise(async (resolve, reject) => {
    try {
      if (release.assets && release.assets.length > 0) {
        const existingAsset = release.assets.find((a) => a.name === assetName);
        if (existingAsset) {
          console.log(`🗑️ Deleting old asset ${assetName} (${existingAsset.id})...`);
          await apiRequest({
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`,
            method: 'DELETE',
            headers: {
              'User-Agent': 'Tiger-Release-Tool',
              'Authorization': `token ${token}`
            }
          });
        }
      }

      const fileStats = fs.statSync(filePath);
      const sizeStr = fileStats.size > 1024 * 1024
        ? `${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(fileStats.size / 1024).toFixed(1)} KB`;
      console.log(`📤 Uploading ${assetName} (${sizeStr}) to GitHub Releases...`);

      const uploadUrl = release.upload_url.split('{')[0] + `?name=${encodeURIComponent(assetName)}`;
      const urlObj = new URL(uploadUrl);

      const fileStream = fs.createReadStream(filePath);
      const uploadReq = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'User-Agent': 'Tiger-Release-Tool',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileStats.size
        }
      }, (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
        res.on('end', () => {
          if (res.statusCode === 201) {
            console.log(`✅ Uploaded ${assetName}: https://github.com/${owner}/${repo}/releases/download/${version}/${assetName}`);
            resolve();
          } else {
            reject(new Error(`Asset upload failed for ${assetName}: HTTP ${res.statusCode} ${data}`));
          }
        });
      });

      uploadReq.on('error', reject);
      fileStream.pipe(uploadReq);
    } catch (err) {
      reject(err);
    }
  });
}

async function run() {
  const notesBody = getReleaseNotesBody();
  console.log(`🔍 Checking if release ${version} exists...`);
  const checkRes = await apiRequest({
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/releases/tags/${version}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Tiger-Release-Tool',
      'Authorization': `token ${token}`
    }
  });

  let release = checkRes.status === 200 ? checkRes.data : null;

  if (!release) {
    console.log(`🚀 Creating new release ${version}...`);
    const createRes = await apiRequest(
      {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases`,
        method: 'POST',
        headers: {
          'User-Agent': 'Tiger-Release-Tool',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        }
      },
      {
        tag_name: version,
        name: `TIGER SYSTEM ${version}`,
        body: notesBody,
        draft: false,
        prerelease: false
      }
    );

    if (createRes.status !== 201) {
      console.error('❌ Failed to create release:', createRes.data);
      process.exit(1);
    }
    release = createRes.data;
    console.log(`✅ Release created: ${release.html_url}`);
  } else {
    console.log(`ℹ️ Release ${version} already exists. Updating notes...`);
    const patchRes = await apiRequest(
      {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/${release.id}`,
        method: 'PATCH',
        headers: {
          'User-Agent': 'Tiger-Release-Tool',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        }
      },
      { body: notesBody }
    );
    if (patchRes.status === 200 && patchRes.data) {
      release = patchRes.data;
    }
  }

  // Upload fast bundle FIRST so auto-updaters see it immediately, then full installer
  await uploadReleaseAsset(release, 'tiger-update.tpkg', tpkgPath);
  await uploadReleaseAsset(release, 'TIGER-Setup.exe', setupPath);
  console.log(`🎉 SUCCESS! Release ${version} published with fast bundle + full installer!`);
}

run().catch((err) => {
  console.error('❌ Publish failed:', err);
  process.exit(1);
});
