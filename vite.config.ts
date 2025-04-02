import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    server: {
        hmr: {
            host: process.env.APP_URL?.replace(/https?:\/\//, ''),
            protocol: process.env.NODE_ENV === 'production' ? 'wss' : 'ws',
        }
    },
    build: {
        assetsInlineLimit: 0,
        manifest: true, // Ensure manifest is generated
    },
    define: {
        'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.APP_URL || 'https://payroll20-production.up.railway.app'),
    },
});