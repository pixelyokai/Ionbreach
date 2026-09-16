/**
 * Flags imported names and module-level consts that are never used again in their file.
 * Crude, but it catches the drift that accumulates while a game is being built out.
 */
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'assets' && entry.name !== 'node_modules') walk(full, out);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

let findings = 0;
for (const file of walk(process.argv[2] ?? 'src')) {
  const src = fs.readFileSync(file, 'utf8');
  const unused = [];

  for (const m of src.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"];/gm)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop().trim();
      if (!name) continue;
      const body = src.slice(0, m.index) + src.slice(m.index + m[0].length);
      if (!new RegExp(`\\b${name}\\b`).test(body)) unused.push(`import ${name}`);
    }
  }

  for (const m of src.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)) {
    const name = m[1];
    if (/^export/.test(src.slice(Math.max(0, m.index - 7), m.index))) continue;
    const rest = src.slice(0, m.index) + src.slice(m.index + m[0].length);
    if (!new RegExp(`\\b${name}\\b`).test(rest)) unused.push(`const ${name}`);
  }

  if (unused.length) {
    findings += unused.length;
    console.log(`${file.split(path.sep).join('/')}\n  ${unused.join('\n  ')}`);
  }
}
console.log(findings ? `\n${findings} unused` : 'nothing unused');
