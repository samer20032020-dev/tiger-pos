const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

function collectFiles(rootDir, baseDir, outList) {
  if (!fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(rootDir, full, outList);
    } else if (entry.isFile()) {
      const rel = path.relative(rootDir, full).replace(/\\/g, '/');
      outList.push({ rel, full });
    }
  }
}

function packAppBundle(projectRoot, outPath, version) {
  const fileRefs = [];
  collectFiles(projectRoot, path.join(projectRoot, 'dist'), fileRefs);
  collectFiles(projectRoot, path.join(projectRoot, 'dist-electron'), fileRefs);

  if (fileRefs.length === 0) {
    throw new Error('dist and dist-electron folders are empty. Run npm run build first.');
  }

  const fileEntries = [];
  const dataBuffers = [];

  for (const ref of fileRefs) {
    const buf = fs.readFileSync(ref.full);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    fileEntries.push({
      path: ref.rel,
      size: buf.length,
      sha256,
    });
    dataBuffers.push(buf);
  }

  const metaObj = {
    version: String(version).replace(/^v/i, ''),
    createdAt: new Date().toISOString(),
    files: fileEntries,
  };
  const metaBuf = Buffer.from(JSON.stringify(metaObj), 'utf8');
  const header = Buffer.alloc(9);
  header.write('TPKG1', 0, 'ascii');
  header.writeUInt32BE(metaBuf.length, 5);

  const combined = Buffer.concat([header, metaBuf, ...dataBuffers]);
  const compressed = zlib.gzipSync(combined, { level: 9 });

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outPath, compressed);

  return {
    fileCount: fileEntries.length,
    rawBytes: combined.length,
    compressedBytes: compressed.length,
  };
}

module.exports = { packAppBundle };
