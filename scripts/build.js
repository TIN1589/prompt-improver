/**
 * build.js — Universal Manifest V3 Bundler
 * Đóng gói tự động:
 * 1. Background Service Worker (ES Module)
 * 2. Content Script (Self-contained IIFE - Zero external imports)
 * 3. UI Standalone Pages (Popup, Options)
 * 4. Đồng bộ Manifest V3 & Static Assets
 */

import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  existsSync,
  rmSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
} from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

async function runBuild() {
  console.log('🚀 Bắt đầu quá trình Build Prompt Improver (Manifest V3)...');

  // 1. Dọn dẹp thư mục dist
  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
  }
  mkdirSync(DIST, { recursive: true });

  // 2. Build UI Pages (Popup, Options)
  console.log('📦 [1/3] Đang đóng gói giao diện UI (Popup & Options)...');
  await build({
    root: ROOT,
    configFile: false,
    resolve: {
      alias: {
        '@': resolve(ROOT, 'src'),
      },
    },
    build: {
      outDir: DIST,
      emptyOutDir: false,
      target: 'es2022',
      rollupOptions: {
        input: {
          popup: resolve(ROOT, 'src/ui/popup/index.html'),
          options: resolve(ROOT, 'src/ui/options/index.html'),
        },
      },
    },
  });

  // 3. Build Background Service Worker (ESM format)
  console.log('⚡ [2/3] Đang đóng gói Background Service Worker (ESM)...');
  await build({
    root: ROOT,
    configFile: false,
    resolve: {
      alias: {
        '@': resolve(ROOT, 'src'),
      },
    },
    build: {
      outDir: DIST,
      emptyOutDir: false,
      target: 'es2022',
      lib: {
        entry: resolve(ROOT, 'src/background/index.ts'),
        name: 'BackgroundServiceWorker',
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          entryFileNames: 'background.js',
        },
      },
    },
  });

  // 4. Build Content Script (IIFE format - 100% self-contained)
  console.log('🛡️ [3/3] Đang đóng gói Content Script (IIFE Self-Contained)...');
  await build({
    root: ROOT,
    configFile: false,
    resolve: {
      alias: {
        '@': resolve(ROOT, 'src'),
      },
    },
    build: {
      outDir: DIST,
      emptyOutDir: false,
      target: 'es2022',
      lib: {
        entry: resolve(ROOT, 'src/content/index.ts'),
        name: 'PromptImproverContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          entryFileNames: 'content.js',
          extend: true,
        },
      },
    },
  });

  // 5. Copy Static Assets & Manifest
  console.log('📋 Đang đồng bộ Manifest V3, Content CSS và Assets...');

  // Copy assets folder
  if (existsSync(resolve(ROOT, 'assets'))) {
    cpSync(resolve(ROOT, 'assets'), resolve(DIST, 'assets'), { recursive: true });
  }

  // Copy content.css
  mkdirSync(resolve(DIST, 'src'), { recursive: true });
  if (existsSync(resolve(ROOT, 'src/content.css'))) {
    cpSync(resolve(ROOT, 'src/content.css'), resolve(DIST, 'src/content.css'));
  }

  // Cập nhật manifest.json cho thư mục dist
  const rawManifest = readFileSync(resolve(ROOT, 'manifest.json'), 'utf-8');
  const manifest = JSON.parse(rawManifest);

  manifest.background = {
    service_worker: 'background.js',
    type: 'module',
  };

  manifest.content_scripts = [
    {
      matches: manifest.content_scripts[0]?.matches || ['<all_urls>'],
      js: ['content.js'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ];

  manifest.action = {
    default_popup: 'src/ui/popup/index.html',
    default_title: 'Prompt Improver — AI Optimizer',
    default_icon: manifest.action?.default_icon || {
      '16': 'assets/icon16.png',
      '48': 'assets/icon48.png',
      '128': 'assets/icon128.png',
    },
  };

  manifest.options_ui = {
    page: 'src/ui/options/index.html',
    open_in_tab: true,
  };

  writeFileSync(resolve(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('🎉 Build hoàn tất thành công! Thư mục `dist/` sẵn sàng tải vào Chrome:');
  console.log('   - Background: dist/background.js');
  console.log('   - Content:    dist/content.js');
  console.log('   - Popup:      dist/src/ui/popup/index.html');
  console.log('   - Options:    dist/src/ui/options/index.html');
  console.log('   - Manifest:   dist/manifest.json');
}

runBuild().catch((err) => {
  console.error('❌ Build thất bại:', err);
  process.exit(1);
});
