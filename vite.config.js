import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
    // Base path: '/' in dev, '/CronoReport/' in build (GitHub Pages)
    base: command === 'serve' ? '/' : '/CronoReport/',

    root: '.',

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login.html'),
                menu: resolve(__dirname, 'menu.html'),
            },
            output: {
                // Mantieni i moduli separati per evitare collisioni di nomi
                preserveModules: true,
                preserveModulesRoot: '.',
            }
        }
    },

    server: {
        port: 3000,
        open: false,
    }
}));
