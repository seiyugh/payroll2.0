import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import fs from 'node:fs';

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
            protocol: 'wss',
        },
        // Correct https configuration
        https: process.env.NODE_ENV === 'production' ? {
            // You can provide proper certs if needed, or use basic https
            key: fs.readFileSync('path/to/key.pem'),
            cert: fs.readFileSync('path/to/cert.pem'),
        } : false,
    },
    build: {
        assetsInlineLimit: 0,
    },
});