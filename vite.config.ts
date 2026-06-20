import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

/**
 * Rollup output plugin cho .cjs:
 *  1. Strip trailing ESM `export { ... };` block (Rollup quirk khi format='cjs').
 *  2. Rewrite leftover ESM `import X from "node:Y"` → `const X = require("node:Y")`.
 *     Lý do: Rollup đôi khi không convert `node:*` prefix imports vì coi như external,
 *     dẫn đến ESM `import` statement còn lại trong file .cjs → Electron throw SyntaxError.
 */
const stripCjsExportBlockPlugin = {
   name: 'strip-cjs-export-block',
   generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
      for (const fileName in bundle) {
         const chunk = bundle[fileName];
         if (chunk.type !== 'chunk' || !fileName.endsWith('.cjs') || !chunk.code) continue;

         let code = chunk.code;
         // 1. Strip ESM export block
         code = code.replace(/\nexport\s*\{[^}]*\};?\s*$/m, '\n');

         // 2-4. Rewrite ESM imports → require() cho Node built-ins (cả `fs` lẫn `node:fs`)
         //      và external bare imports mà Rollup không convert (vd: `pdfkit/...`).
         // Pattern source: bất kỳ string nào không phải đường dẫn relative './...' hoặc '/...'
         const importPathPattern = `["']([^"'./][^"']*)["']`;

         // a) import X from "Y";
         code = code.replace(
            new RegExp(`^import\\s+(\\w[\\w$]*)\\s+from\\s+${importPathPattern};?$`, 'gm'),
            'const $1 = require("$2");'
         );
         // b) import { a, b as c } from "Y";
         code = code.replace(
            new RegExp(`^import\\s+\\{([^}]+)\\}\\s+from\\s+${importPathPattern};?$`, 'gm'),
            'const {$1} = require("$2");'
         );
         // c) import * as X from "Y";
         code = code.replace(
            new RegExp(
               `^import\\s+\\*\\s+as\\s+(\\w[\\w$]*)\\s+from\\s+${importPathPattern};?$`,
               'gm'
            ),
            'const $1 = require("$2");'
         );
         // d) import "Y";  (side-effect-only import)
         code = code.replace(
            new RegExp(`^import\\s+${importPathPattern};?$`, 'gm'),
            'require("$1");'
         );

         chunk.code = code;
      }
   },
};

export default defineConfig({
   define: {
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
   },
   plugins: [
      react(),
      tailwindcss(),
      electron([
         {
            // Main process: dùng build.lib để Vite convert tất cả `import 'node:xxx'` → require().
            entry: 'electron/main.ts',
            onstart({ startup }) {
               const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
               void ELECTRON_RUN_AS_NODE;
               startup(undefined, { env });
            },
            vite: {
               build: {
                  lib: {
                     entry: 'electron/main.ts',
                     formats: ['cjs'],
                     fileName: () => 'main.cjs',
                  },
                  rollupOptions: {
                     plugins: [stripCjsExportBlockPlugin],
                     output: {
                        format: 'cjs',
                        entryFileNames: 'main.cjs',
                        exports: 'auto',
                        inlineDynamicImports: true,
                     },
                  },
               },
            },
         },
         {
            // Preload: dùng build.lib để Vite convert `import 'electron'` → require().
            // Plugin strip-cjs-export-block xoá trailing `export { ... };` mà Rollup
            // vẫn emit dù format='cjs' (Rollup/Vite lib mode quirk).
            entry: 'electron/preload.ts',
            onstart({ reload }) {
               reload();
            },
            vite: {
               build: {
                  lib: {
                     entry: 'electron/preload.ts',
                     formats: ['cjs'],
                     fileName: () => 'preload.cjs',
                  },
                  rollupOptions: {
                     plugins: [stripCjsExportBlockPlugin],
                     output: {
                        format: 'cjs',
                        entryFileNames: 'preload.cjs',
                        exports: 'auto',
                        inlineDynamicImports: true,
                     },
                  },
               },
            },
         },
      ]),
   ],
   base: './',
   build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
         input: {
            main: path.resolve(__dirname, 'index.html'),
         },
      },
   },
   server: {
      port: 5173,
   },
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './src'),
      },
   },
});
