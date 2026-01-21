import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/docs': {
				target: 'http://localhost:4321',
				changeOrigin: true
			}
		}
	}
});
