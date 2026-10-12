/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import pkg from './package.json' with { type: 'json' }

/** Offline single-file build: inline the favicon and drop links to files that are not bundled. */
function offlineHtml(): Plugin {
  return {
    name: 'offline-html',
    transformIndexHtml(html) {
      const svg = readFileSync(new URL('./public/favicon.svg', import.meta.url), 'utf8')
      const dataUri = 'data:image/svg+xml,' + encodeURIComponent(svg)
      return html
        .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${dataUri}" />`)
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
    },
  }
}

// Two build targets:
//  - default: multi-file website (upload `dist/` to any static host, e.g. Netlify)
//  - offline: one self-contained `dist-offline/index.html` that works by double-click
export default defineConfig(({ mode }) => {
  const offline = mode === 'offline'
  return {
    base: './',
    resolve: {
      // jsPDF can render HTML via these packages; we only draw text and lines, so leave them out.
      alias: {
        html2canvas: fileURLToPath(new URL('./src/lib/empty-module.ts', import.meta.url)),
        dompurify: fileURLToPath(new URL('./src/lib/empty-module.ts', import.meta.url)),
        canvg: fileURLToPath(new URL('./src/lib/empty-module.ts', import.meta.url)),
      },
    },
    plugins: [react(), tailwindcss(), ...(offline ? [offlineHtml(), viteSingleFile({ removeViteModuleLoader: true })] : [])],
    define: {
      __OFFLINE__: JSON.stringify(offline),
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      outDir: offline ? 'dist-offline' : 'dist',
      emptyOutDir: true,
      assetsInlineLimit: offline ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 2000,
      copyPublicDir: !offline,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
