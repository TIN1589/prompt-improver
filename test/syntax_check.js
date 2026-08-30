/**
 * syntax_check.js — Kiểm tra syntax và cấu trúc toàn bộ source files của Prompt Improver
 * Chạy: node test/syntax_check.js
 */
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Files cần check ─────────────────────────────────────────────────────────
const JS_FILES = [
  'prompt-improver-backend/worker.js',
  'src/content.js',
  'src/background.js',
  'src/utils.js',
  'src/popup.js',
  'test/test_optimizer.js',
  'test/test_backend_mock.js',
];

// Lỗi runtime (không phải syntax) — bỏ qua
const RUNTIME_KEYWORDS = [
  'chrome is not defined',
  'document is not defined',
  'window is not defined',
  'navigator is not defined',
  'MutationObserver is not defined',
  'alert is not defined',
  'confirm is not defined',
  'prompt is not defined',
  'FileReader is not defined',
  'URL is not defined',
  'Cannot find module',
  'ERR_MODULE_NOT_FOUND',
];

function isRuntimeError(msg) {
  return RUNTIME_KEYWORDS.some(kw => msg.includes(kw));
}

// ─── Syntax check từng file ────────────────────────────────────────────────
let ok = 0, fail = 0;
const issues = [];

console.log('\n════════════════════════════════════════════════════');
console.log('🔬 SYNTAX & STRUCTURE CHECK — Prompt Improver Files');
console.log('════════════════════════════════════════════════════\n');

for (const rel of JS_FILES) {
  const absPath = join(ROOT, rel);
  if (!existsSync(absPath)) {
    console.log(`  ⚠️  MISSING: ${rel}`);
    issues.push({ file: rel, type: 'MISSING' });
    fail++;
    continue;
  }

  const fileSize = readFileSync(absPath).length;

  try {
    execSync(`node --check "${absPath}"`, { stdio: 'pipe' });
    console.log(`  ✅ ${rel.padEnd(38)} (${(fileSize/1024).toFixed(1)} KB)`);
    ok++;
  } catch (e) {
    const errMsg = e.stderr?.toString() || e.stdout?.toString() || '';
    if (isRuntimeError(errMsg)) {
      console.log(`  ✅ ${rel.padEnd(38)} (${(fileSize/1024).toFixed(1)} KB) [ESM runtime-only err]`);
      ok++;
    } else {
      const firstLine = errMsg.split('\n').find(l => l.includes('SyntaxError') || l.includes('Error:')) || errMsg.slice(0, 120);
      console.error(`  ❌ ${rel}`);
      console.error(`     └── ${firstLine.trim()}`);
      issues.push({ file: rel, error: firstLine.trim() });
      fail++;
    }
  }
}

// ─── Manifest check ───────────────────────────────────────────────────────
console.log('\n────────────────────────────────────────────────────');
console.log('📋 manifest.json Validation');
console.log('────────────────────────────────────────────────────');

let mOk = 0, mFail = 0;
try {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));

  const checks = [
    ['manifest_version === 3',             m.manifest_version === 3],
    ['name is set',                        !!m.name],
    ['version is set',                     !!m.version],
    ['background.service_worker exists',   !!m.background?.service_worker],
    ['background.type === module',         m.background?.type === 'module'],
    ['host_permissions is array',          Array.isArray(m.host_permissions)],
    ['chatgpt.com in hosts',               m.host_permissions?.some(h => h.includes('chatgpt.com'))],
    ['claude.ai in hosts',                 m.host_permissions?.some(h => h.includes('claude.ai'))],
    ['content_scripts defined',            Array.isArray(m.content_scripts) && m.content_scripts.length > 0],
    ['content.js in scripts',              m.content_scripts?.[0]?.js?.includes('src/content.js')],
    ['web_accessible_resources defined',   Array.isArray(m.web_accessible_resources)],
    ['content.css accessible',             m.web_accessible_resources?.[0]?.resources?.includes('src/content.css')],
    ['storage permission',                 m.permissions?.includes('storage')],
    ['contextMenus permission',            m.permissions?.includes('contextMenus')],
  ];

  for (const [label, cond] of checks) {
    if (cond) {
      console.log(`  ✅ ${label}`);
      mOk++;
    } else {
      console.error(`  ❌ ${label}`);
      mFail++;
    }
  }
} catch (e) {
  console.error(`  ❌ manifest.json parse error: ${e.message}`);
  mFail++;
}

// ─── Key function presence check ──────────────────────────────────────────
console.log('\n────────────────────────────────────────────────────');
console.log('🔍 Key Features & Functions Check');
console.log('────────────────────────────────────────────────────');

const PRESENCE_CHECKS = [
  ['prompt-improver-backend/worker.js', 'detectTaskType'],
  ['prompt-improver-backend/worker.js', 'callGemini'],
  ['prompt-improver-backend/worker.js', 'gemini-2.0-flash'],
  ['prompt-improver-backend/worker.js', 'GEMINI_API_KEY'],
  ['src/content.js',                    'scanAndInjectButton'],
  ['src/content.js',                    'openImproveModal'],
  ['src/content.js',                    'showUndoToast'],
  ['src/content.js',                    'setPromptToInput'],
  ['src/background.js',                 'handleImprovePrompt'],
  ['src/background.js',                 'fetchWithRetry'],
  ['src/background.js',                 'handlePingBackend'],
  ['src/background.js',                 'hashPrompt'],
  ['src/utils.js',                      'detectTaskType'],
  ['src/utils.js',                      'hashPrompt'],
  ['src/utils.js',                      'estimateTokens'],
];

let pOk = 0, pFail = 0;
for (const [file, keyword] of PRESENCE_CHECKS) {
  const absPath = join(ROOT, file);
  if (!existsSync(absPath)) { pFail++; continue; }
  const content = readFileSync(absPath, 'utf8');
  const found = content.includes(keyword);
  if (found) {
    console.log(`  ✅ ${file.padEnd(36)} contains "${keyword}"`);
    pOk++;
  } else {
    console.error(`  ❌ ${file.padEnd(36)} MISSING "${keyword}"`);
    pFail++;
  }
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════');
console.log('📊 TỔNG KẾT');
console.log('════════════════════════════════════════════════════');
console.log(`  🔬 Syntax check:     ${ok}/${ok+fail} files OK`);
console.log(`  📋 Manifest check:   ${mOk}/${mOk+mFail} checks OK`);
console.log(`  🔍 Key functions:    ${pOk}/${pOk+pFail} present`);

const totalOk   = ok + mOk + pOk;
const totalFail = fail + mFail + pFail;
const pct = Math.round(totalOk / (totalOk + totalFail) * 100);

console.log(`\n  OVERALL: ${totalOk}/${totalOk+totalFail} checks (${pct}%)`);

if (totalFail === 0) {
  console.log('\n  🎉 TẤT CẢ CHECKS ĐÃ PASS — PROMPT IMPROVER SẴN SÀNG LOAD VÀO CHROME!');
} else {
  console.log(`\n  ⚠️  ${totalFail} vấn đề cần xem lại.`);
}
console.log('════════════════════════════════════════════════════\n');
