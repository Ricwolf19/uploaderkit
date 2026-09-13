import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = (sub: string) =>
	fileURLToPath(new URL(`../packages/uploaderkit/src/${sub}`, import.meta.url))

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		/**
		 * Resolve the package to its **source**, not `dist`: `pnpm dev` runs
		 * tsup's watcher in parallel and tsup cleans `dist` on start, so
		 * resolving through the package `exports` races an empty directory.
		 *
		 * Subpaths come first because the array matches in order, and the bare
		 * specifier is anchored — a plain string `find` matches by prefix and
		 * would swallow `uploaderkit/tailwind.css`.
		 */
		alias: [
			{ find: 'uploaderkit/react', replacement: pkg('react.ts') },
			{ find: 'uploaderkit/ui', replacement: pkg('ui.ts') },
			{
				find: 'uploaderkit/presets',
				replacement: pkg('presets.ts'),
			},
			{ find: /^uploaderkit$/, replacement: pkg('index.ts') },
		],
	},
	server: {
		port: 5173,
		open: true,
	},
})
