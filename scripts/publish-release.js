const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

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

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = `v${pkg.version}`;
const owner = 'samer20032020-dev';
const repo = 'tiger-pos';
const token = getGitHubToken();

if (!token) {
  console.error('❌ No GitHub token found!');
  process.exit(1);
}

const setupPath = path.join(__dirname, '..', 'release', 'TIGER-Setup.exe');
if (!fs.existsSync(setupPath)) {
  console.error('❌ Installer file not found at:', setupPath);
  process.exit(1);
}

const stats = fs.statSync(setupPath);
console.log(`📦 Preparing release ${version} with installer size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

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

async function run() {
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
        name: `TIGER SYSTEM ${version} - تحديث رسمي شامل`,
        body: `🎉 ميزات وتحسينات الإصدار ${version}:\n• نظام متكامل لطباعة ملصقات الباركود والأسعار.\n• لاصق استلام ظهر أجهزة الصيانة.\n• دعم تحديد عدد النسخ والمقاسات الحرارية المتعددة.\n• حفظ واستقرار كافة الفواتير والبيانات والديون.`,
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
    console.log(`ℹ️ Release ${version} already exists.`);
  }

  // Check if asset already exists
  if (release.assets && release.assets.length > 0) {
    const existingAsset = release.assets.find((a) => a.name === 'TIGER-Setup.exe');
    if (existingAsset) {
      console.log(`🗑️ Deleting existing asset ${existingAsset.id} to re-upload...`);
      await apiRequest({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`,
        method: 'DELETE',
        headers: {
          'User-Agent': 'Tiger-Release-Tool',
          'Authorization': `token ${token}`
        }
      });
      console.log(`✅ Old asset deleted.`);
    }
  }

  console.log(`📤 Uploading TIGER-Setup.exe (${(stats.size / (1024 * 1024)).toFixed(2)} MB) to GitHub Releases...`);

  // Upload asset
  const uploadUrl = release.upload_url.split('{')[0] + '?name=TIGER-Setup.exe';
  const urlObj = new URL(uploadUrl);

  const fileStream = fs.createReadStream(setupPath);
  const uploadReq = https.request({
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: {
      'User-Agent': 'Tiger-Release-Tool',
      'Authorization': `token ${token}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': stats.size
    }
  }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log(`🎉 SUCCESS! TIGER-Setup.exe successfully published to GitHub Release ${version}!`);
        console.log(`🔗 Public Download URL: https://github.com/${owner}/${repo}/releases/download/${version}/TIGER-Setup.exe`);
      } else {
        console.error('❌ Asset upload failed:', res.statusCode, data);
      }
    });
  });

  uploadReq.on('error', (err) => {
    console.error('❌ Upload error:', err);
  });

  fileStream.pipe(uploadReq);
}

run().catch(console.error);
