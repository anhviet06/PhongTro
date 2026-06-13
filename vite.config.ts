import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

/**
 * Rollup output plugin: strip trailing ESM `export { ... };` block.
 *
 * Lý do: Vite lib mode (`build.lib`) khi output format='cjs' VẪN emit ESM-style
 * `export { name };` block ở cuối file để expose named exports — đây là Rollup quirk.
 * Trong file `.cjs` mà có `export` keyword → Electron load thành CJS → SyntaxError.
 *
 * Plugin này quét bundle, với mỗi chunk `.cjs` xoá đoạn `export { ... };` cuối file.
 * Side-effect (contextBridge.exposeInMainWorld) vẫn chạy bình thường — preload không cần export.
 */
const stripCjsExportBlockPlugin = {
   name: 'strip-cjs-export-block',
   generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
      for (const fileName in bundle) {
         const chunk = bundle[fileName];
         if (chunk.type === 'chunk' && fileName.endsWith('.cjs') && chunk.code) {
            chunk.code = chunk.code.replace(/\nexport\s*\{[^}]*\};?\s*$/m, '\n');
         }
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
