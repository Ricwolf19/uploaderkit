import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		react: 'src/react.ts',
		ui: 'src/ui.ts',
		presets: 'src/presets.ts',
		server: 'src/server.ts',
		'server/express': 'src/server/express.ts',
		'server/next': 'src/server/next.ts',
		'adapters/memory': 'src/adapters/memory.ts',
		'adapters/gcs': 'src/adapters/gcs.ts',
		'adapters/s3': 'src/adapters/s3.ts',
	},
	format: ['esm', 'cjs'],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	target: 'es2022',
	// React and the provider SDKs are peers: inlining them breaks instanceof
	// across the boundary and forces every consumer to carry every provider.
	external: [
		'react',
		'react-dom',
		'react/jsx-runtime',
		'@google-cloud/storage',
		'@aws-sdk/client-s3',
		'@aws-sdk/s3-request-presigner',
	],
})
