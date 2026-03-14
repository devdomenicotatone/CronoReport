import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    // Base path: '/' in dev, '/CronoReport/' in build (GitHub Pages)
    base: command === 'serve' ? '/' : '/CronoReport/',

    root: '.',

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // Mantieni i moduli separati per evitare collisioni di nomi
        rollupOptions: {
            output: {
                // Forza ogni modulo in un chunk separato
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
