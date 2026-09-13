/** The core modules that must stay isomorphic — no React, no Node builtins. */
const CORE =
	'^packages/uploaderkit/src/(index|constants|file|scopes|types|validation|labels|warn)\\.ts$'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment:
				'Circular imports break ESM chunking and make the module graph unreadable.',
			from: {},
			to: { circular: true },
		},
		{
			name: 'no-orphans',
			severity: 'error',
			comment: 'Unreachable module — delete it or wire it to an entry point.',
			from: {
				orphan: true,
				pathNot: [
					'(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
					'\\.d\\.ts$',
					'(^|/)tsconfig\\.json$',
					'packages/uploaderkit/src/index\\.ts$',
				],
			},
			to: {},
		},
		{
			name: 'core-stays-isomorphic',
			severity: 'error',
			comment:
				'The core entry must run in a browser AND in Node. Importing a node builtin here breaks the single-source validation contract. `/server` is the Node side and is exempt.',
			from: { path: CORE },
			to: {
				dependencyTypes: ['core'],
				path: '^(node:)?(fs|path|crypto|stream|http|https|os|child_process)$',
			},
		},
		{
			name: 'no-react-in-core',
			severity: 'error',
			comment:
				'The core entry ships to servers; it must not pull React in. React lives behind the /react and /ui subpaths.',
			from: { path: CORE },
			to: { path: '^react' },
		},
		{
			name: 'no-react-in-server',
			severity: 'error',
			comment: 'The server layer must never depend on React either.',
			from: { path: '^packages/uploaderkit/src/(server|adapters)/' },
			to: { path: '^react' },
		},
		{
			name: 'not-to-dev-dep',
			severity: 'error',
			comment:
				'A published module must not depend on a devDependency. Peers are exempt: react and the provider SDKs are installed as devDeps only so the repo can typecheck.',
			from: {
				path: 'packages/uploaderkit/src',
				pathNot: '\\.test\\.tsx?$',
			},
			to: {
				dependencyTypes: ['npm-dev'],
				dependencyTypesNot: ['npm-peer'],
			},
		},
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		tsConfig: { fileName: 'tsconfig.base.json' },
		tsPreCompilationDeps: true,
	},
}
