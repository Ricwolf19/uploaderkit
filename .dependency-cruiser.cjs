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
				'The core entry must run in a browser AND in Node. Importing react or a node builtin here breaks the single-source validation contract.',
			from: { path: 'packages/uploaderkit/src' },
			to: {
				dependencyTypes: ['core'],
				path: '^(fs|path|crypto|stream|http|https|os|child_process)$',
			},
		},
		{
			name: 'no-react-in-core',
			severity: 'error',
			comment: 'The core entry ships to servers; it must not pull React in.',
			from: { path: 'packages/uploaderkit/src' },
			to: { path: '^react' },
		},
		{
			name: 'not-to-dev-dep',
			severity: 'error',
			comment: 'A published module must not depend on a devDependency.',
			from: { path: 'packages/uploaderkit/src', pathNot: '\\.test\\.ts$' },
			to: { dependencyTypes: ['npm-dev'] },
		},
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		tsConfig: { fileName: 'tsconfig.base.json' },
		tsPreCompilationDeps: true,
	},
}
