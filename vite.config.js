import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { sharedFiles, syncPreloadFile } from './scripts/sync-preload.mjs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'sync-preload',
    configureServer(server) {
      const files = sharedFiles.map(entry => ({
        ...entry,
        sourcePath: fileURLToPath(entry.source),
      }));
      server.watcher.add(files.map(file => file.sourcePath));
      server.watcher.on('change', (file) => {
        const entry = files.find(entry => entry.sourcePath === file);
        if (entry)
          syncPreloadFile(entry);
      });
    },
  }],
  base: './',
});
