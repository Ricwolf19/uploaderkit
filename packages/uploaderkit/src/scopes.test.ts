import { describe, expect, it } from 'vitest'

import { MB } from './constants'
import { getMimeType, sanitizeFileName } from './file'
import {
	assertProviderSupports,
	defineScopes,
	hasStableKey,
	resolveKey,
	resolveReplaceMode,
	resolveScopePrefix,
	ScopeError,
	validateForScope,
} from './scopes'
import type { FileLike, ScopeConfig, StorageProvider } from './types'

const fileOf = (name: string, bytes: number[] = [], size = bytes.length) =>
	({
		name,
		size,
		type: getMimeType(name),
		arrayBuffer: async () => new Uint8Array(bytes).buffer,
	}) satisfies FileLike

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46]

const registry = defineScopes({
	'company-documents': {
		path: (id, file) => `Companies/${id}/documents/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: 20 * MB,
		category: 'pdf',
		encrypt: true,
	},
	'user-avatar': {
		path: id => `Users/${id}/avatar`,
		visibility: 'public',
		accept: ['png', 'jpg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
		compress: { maxWidth: 512, quality: 0.8 },
		overwrite: true,
	},
})

const providerWith = (signedUrl: boolean): StorageProvider => ({
	name: signedUrl ? 'gcs' : 'toy',
	capabilities: { signedUrl, resumable: false, rangeRead: false },
	put: async () => ({ key: 'k', url: 'u' }),
	get: async () => new Uint8Array(),
	delete: async () => true,
	list: async () => [],
	...(signedUrl ? { signedUrl: async () => 'https://signed' } : {}),
})

describe('defineScopes', () => {
	it('exposes names and derives the accept attribute', () => {
		expect(registry.names).toEqual(['company-documents', 'user-avatar'])
		expect(registry.accept('user-avatar')).toBe('.png,.jpg,.webp')
		expect(registry.has('company-documents')).toBe(true)
		expect(registry.has('nope')).toBe(false)
	})

	it('lists the declared scopes when asked for an unknown one', () => {
		expect(() => registry.get('nope')).toThrow(/Declared: company-documents/)
	})

	it('rejects a scope that widens its category', () => {
		expect(() =>
			defineScopes({
				bad: {
					path: id => id,
					visibility: 'public',
					accept: ['pdf', 'mp4'],
					maxBytes: MB,
					category: 'pdf',
				},
			})
		).toThrow(ScopeError)
	})

	it('rejects compression on a scope that takes non-images', () => {
		expect(() =>
			defineScopes({
				bad: {
					path: id => id,
					visibility: 'public',
					accept: ['pdf'],
					maxBytes: MB,
					compress: { maxWidth: 100 },
				},
			})
		).toThrow(/only applies to images/)
	})

	it('rejects an empty accept list', () => {
		expect(() =>
			defineScopes({
				bad: {
					path: id => id,
					visibility: 'public',
					accept: [],
					maxBytes: MB,
				},
			})
		).toThrow(/cannot be empty/)
	})
})

describe('validateForScope', () => {
	it('accepts a file the scope allows', async () => {
		const result = await validateForScope(
			registry,
			'company-documents',
			fileOf('acta.pdf', PDF_HEADER)
		)
		expect(result.valid).toBe(true)
	})

	it('rejects an extension the scope does not list', async () => {
		const result = await validateForScope(
			registry,
			'company-documents',
			fileOf('foto.png', [0x89, 0x50, 0x4e, 0x47])
		)
		expect(result).toMatchObject({
			valid: false,
			code: 'extension-not-allowed',
		})
	})

	it('applies the scope size ceiling', async () => {
		const result = await validateForScope(
			registry,
			'user-avatar',
			fileOf('big.png', [], 6 * MB)
		)
		expect(result).toMatchObject({ valid: false, code: 'too-large' })
	})
})

describe('assertProviderSupports', () => {
	it('accepts a provider that can sign', () => {
		expect(() =>
			assertProviderSupports(registry, providerWith(true))
		).not.toThrow()
	})

	it('refuses private scopes on a provider that cannot sign', () => {
		expect(() => assertProviderSupports(registry, providerWith(false))).toThrow(
			/company-documents/
		)
	})
})

describe('resolveKey', () => {
	const sanitized = defineScopes({
		docs: {
			path: (id, file) => `Docs/${id}/${sanitizeFileName(file.name)}`,
			visibility: 'private',
			accept: ['png'],
			maxBytes: 1024,
		},
	})

	it('accepts a name whose dots are not a path segment', () => {
		expect(
			resolveKey(sanitized, 'docs', 'c1', fileOf('a. b..png'))
		).not.toContain('..')
	})

	it('still blocks a real traversal segment', () => {
		const raw = defineScopes({
			docs: {
				path: (id, file) => `Docs/${id}/${file.name}`,
				visibility: 'private',
				accept: ['png'],
				maxBytes: 1024,
			},
		})

		expect(() =>
			resolveKey(raw, 'docs', 'c1', fileOf('../../etc/passwd.png'))
		).toThrow(/unsafe key/)
	})

	it('builds the key from the scope', () => {
		expect(
			resolveKey(registry, 'company-documents', 'abc', fileOf('acta.pdf'))
		).toBe('Companies/abc/documents/acta.pdf')
	})

	it('blocks traversal coming from a file name', () => {
		expect(() =>
			resolveKey(
				registry,
				'company-documents',
				'abc',
				fileOf('../../etc/passwd')
			)
		).toThrow(/unsafe key/)
	})
})

const base = {
	visibility: 'private',
	accept: ['pdf'],
	maxBytes: 1 * MB,
} satisfies Omit<ScopeConfig, 'path'>

describe('resolveReplaceMode', () => {
	it('sweeps the entity when the key carries the file name', () => {
		const scope = {
			...base,
			path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
		}
		expect(resolveReplaceMode(scope)).toBe('entity')
	})

	it('only overwrites the key when the path ignores the file name', () => {
		// Nothing to sweep: the provider replaces the object in place, so the
		// extra list call per upload would buy nothing.
		const scope = { ...base, path: (id: string) => `X/${id}/single.pdf` }
		expect(hasStableKey(scope)).toBe(true)
		expect(resolveReplaceMode(scope)).toBe('key')
	})

	it('keeps siblings when the scope holds a collection', () => {
		const scope = {
			...base,
			maxFiles: 10,
			path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
		}
		expect(resolveReplaceMode(scope)).toBe('key')
	})

	it('lets a scope opt out of every sweep', () => {
		const scope = {
			...base,
			replace: false as const,
			path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
		}
		expect(resolveReplaceMode(scope)).toBe(false)
	})
})

describe('resolveScopePrefix', () => {
	it('defaults to the folder of the resolved key', () => {
		const scope = {
			...base,
			path: (id: string, file: { name: string }) => `X/${id}/docs/${file.name}`,
		}
		expect(resolveScopePrefix(scope, 'abc')).toBe('X/abc/docs')
	})

	it('honours an explicit prefix', () => {
		const scope = {
			...base,
			prefix: (id: string) => `X/${id}/only-here`,
			path: (id: string, file: { name: string }) =>
				`X/${id}/only-here/${file.name}`,
		}
		expect(resolveScopePrefix(scope, 'abc')).toBe('X/abc/only-here')
	})
})

describe('defineScopes validation', () => {
	it('rejects an entity-wide replace on a collection', () => {
		expect(() =>
			defineScopes({
				expediente: {
					...base,
					maxFiles: 10,
					replace: 'entity',
					path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
				},
			})
		).toThrow(ScopeError)
	})

	it('rejects a non-positive maxFiles', () => {
		expect(() =>
			defineScopes({
				bad: { ...base, maxFiles: 0, path: (id: string) => `X/${id}/a.pdf` },
			})
		).toThrow(/positive integer/)
	})

	it('rejects a sweep that would reach another scope', () => {
		// `avatar` would sweep `Users/{id}`, which also holds `docs`.
		expect(() =>
			defineScopes({
				avatar: {
					...base,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/${file.name}`,
				},
				docs: {
					...base,
					maxFiles: 5,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/docs/${file.name}`,
				},
			})
		).toThrow(/would sweep/)
	})

	it('accepts sibling folders under the same entity', () => {
		expect(() =>
			defineScopes({
				identity: {
					...base,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/identity/${file.name}`,
				},
				docs: {
					...base,
					maxFiles: 5,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/docs/${file.name}`,
				},
			})
		).not.toThrow()
	})

	it('rejects an entity sweep rooted at the bucket', () => {
		expect(() =>
			defineScopes({
				loose: {
					...base,
					path: (_id: string, file: { name: string }) => file.name,
				},
			})
		).toThrow(/bucket-root/)
	})

	it('still runs the core validations', () => {
		expect(() =>
			defineScopes({
				empty: { ...base, accept: [], path: (id: string) => `X/${id}/a.pdf` },
			})
		).toThrow(ScopeError)
	})
})
