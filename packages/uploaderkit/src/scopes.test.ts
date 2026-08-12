import { describe, expect, it } from 'vitest'
import { MB } from './constants'
import { getMimeType } from './file'
import {
	assertProviderSupports,
	defineScopes,
	resolveKey,
	ScopeError,
	validateForScope,
} from './scopes'
import type { FileLike, StorageProvider } from './types'

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
