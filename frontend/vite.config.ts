import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
        proxy: {
            '/auth': { target: 'http://localhost:4000', changeOrigin: true },
            '/db-connections': { target: 'http://localhost:4000', changeOrigin: true },
            '/executions': { target: 'http://localhost:4000', changeOrigin: true },
            '/scripts': { target: 'http://localhost:4000', changeOrigin: true },
            '/audit': { target: 'http://localhost:4000', changeOrigin: true },
            '/changes': { target: 'http://localhost:4000', changeOrigin: true },
            '/openapi.json': { target: 'http://localhost:4000', changeOrigin: true },
            '/docs': { target: 'http://localhost:4000', changeOrigin: true },
        },
	},
});