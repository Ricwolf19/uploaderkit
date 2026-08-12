import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: [
			'**/dist/**',
			'**/node_modules/**',
			'**/coverage/**',
			'**/build/**',
			'**/.vite/**',
			'**/docs/**',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.cjs', '**/*.config.{js,cjs,mjs,ts}'],
		languageOptions: {
			globals: { ...globals.node },
			sourceType: 'commonjs',
		},
	},
	{
		files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		plugins: {
			react,
			'react-hooks': reactHooks,
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
		},
		settings: {
			react: { version: 'detect' },
		},
		rules: {
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
	// JSDoc on the package's public source. The `recommended-typescript` preset
	// validates existing JSDoc (alignment, tag names, param-name match) without
	// requiring redundant `{type}` annotations; `require-jsdoc` then enforces
	// presence on every exported function, type and hook.
	{
		files: ['packages/listkit/src/**/*.{ts,tsx}'],
		// Internal building blocks not re-exported from a package entry; they get
		// brief inline comments, not enforced JSDoc.
		ignores: [
			'packages/listkit/src/components/filters/inputs/**',
			'packages/listkit/src/filters/**',
			'packages/listkit/src/hooks/useListShortcuts.ts',
			'packages/listkit/src/utils/getPath.ts',
			'packages/listkit/src/utils/cn.ts',
			'packages/listkit/src/utils/shortcut.ts',
			'packages/listkit/src/constants.ts',
		],
		plugins: { jsdoc },
		extends: [jsdoc.configs['flat/recommended-typescript']],
		// We write TSDoc (what TypeDoc + the TS language server read), so keep
		// `@typeParam` and treat `@defaultValue` as a valid block tag.
		settings: {
			jsdoc: {
				mode: 'typescript',
				tagNamePreference: { template: 'typeParam' },
			},
		},
		rules: {
			'jsdoc/require-jsdoc': [
				'error',
				{
					publicOnly: true,
					require: { FunctionDeclaration: true },
					contexts: [
						'ExportNamedDeclaration > TSTypeAliasDeclaration',
						'ExportNamedDeclaration > TSInterfaceDeclaration',
						'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
					],
				},
			],
			// TypeScript already documents shapes; descriptions/returns are optional.
			'jsdoc/require-param': 'off',
			'jsdoc/require-returns': 'off',
			'jsdoc/require-param-description': 'off',
			'jsdoc/require-returns-description': 'off',
			'jsdoc/tag-lines': 'off',
			'jsdoc/check-tag-names': [
				'warn',
				{
					definedTags: [
						'typeParam',
						'remarks',
						'defaultValue',
						'packageDocumentation',
					],
				},
			],
			'jsdoc/escape-inline-tags': 'off',
		},
	},
	prettier
)
