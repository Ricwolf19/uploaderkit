import { describe, expect, it } from 'vitest'

import { createMemoryProvider } from '../adapters/memory'
import { MB } from '../constants'
import { getMimeType } from '../file'
import { ScopeError } from '../scopes'
import { defineScopes } from '../scopes'
import type { CryptoHooks, FileLike } from '../types'
import { createStorage, StorageRequestError } from './storage'

// The registry every case below runs against: a public scope with a stable key,
// a private encrypted one whose key carries the file name, and their
// entity-level twins — enough shape to exercise replace, sweep and crypto.
const testScopes = defineScopes({
	'user-avatar': {
		path: userId => `Users/${userId}/avatar`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
		compress: { maxWidth: 512, quality: 0.8, stripExif: true },
	},
	'user-documents': {
		path: (userId, file) => `Users/${userId}/documents/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: 20 * MB,
		category: 'pdf',
		encrypt: true,
	},
	'company-identity': {
		path: (companyId, file) => `Companies/${companyId}/identity/${file.name}`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
		maxBytes: 5 * MB,
		category: 'image',
	},
	'company-documents': {
		path: (companyId, file) => `Companies/${companyId}/documents/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: 20 * MB,
		category: 'pdf',
		encrypt: true,
	},
})

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46]
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const fileOf = (name: string, bytes: number[]): FileLike => ({
	name,
	size: bytes.length,
	type: getMimeType(name),
	arrayBuffer: async () => new Uint8Array(bytes).buffer,
})

// XOR "cipher": worthless as crypto, perfect for asserting that encrypt and
// decrypt actually ran — the stored bytes must differ, the read bytes must not.
const xorCrypto: CryptoHooks = {
	encrypt: data => data.map(byte => byte ^ 0x55),
	decrypt: data => data.map(byte => byte ^ 0x55),
}

const viewPath = ({
	scope,
	entityId,
	key,
}: {
	scope: string
	entityId: string
	key: string
}) => `/storage/${scope}/${entityId}/view?key=${encodeURIComponent(key)}`

const setup = () => {
	const provider = createMemoryProvider()
	const storage = createStorage({
		scopes: testScopes,
		provider,
		crypto: xorCrypto,
		encryptedUrl: viewPath,
	})
	return { provider, storage }
}

describe('createStorage — boot guards', () => {
	it('refuses encrypted scopes without an injected cipher', () => {
		expect(() =>
			createStorage({
				scopes: testScopes,
				provider: createMemoryProvider(),
				encryptedUrl: viewPath,
			})
		).toThrow(ScopeError)
	})

	it('refuses encrypted scopes without a view url — signed urls serve ciphertext', () => {
		expect(() =>
			createStorage({
				scopes: testScopes,
				provider: createMemoryProvider(),
				crypto: xorCrypto,
			})
		).toThrow(/encryptedUrl/)
	})
})

describe('createStorage — upload', () => {
	it('stores a private document encrypted and points its url at the view route', async () => {
		const { provider, storage } = setup()
		const raw = PDF_HEADER

		const stored = await storage.upload({
			scope: 'company-documents',
			entityId: 'c1',
			file: fileOf('acta.pdf', raw),
			uploadedBy: 'u9',
		})

		expect(stored.key).toBe('Companies/c1/documents/acta.pdf')
		// Never a bucket/signed url: the object is ciphertext — only the app's
		// authenticated view endpoint can serve it readable.
		expect(stored.url).toBe(
			'/storage/company-documents/c1/view?key=Companies%2Fc1%2Fdocuments%2Facta.pdf'
		)
		expect(stored.uploadedBy).toBe('u9')
		expect(stored.checksum).toMatch(/^[0-9a-f]{64}$/)

		const object = provider.objects.get(stored.key)!
		// Ciphertext on disk, opaque MIME so nothing tries to render it.
		expect([...object.body]).not.toEqual(raw)
		expect(object.contentType).toBe('application/octet-stream')

		// read() undoes the cipher.
		const bytes = await storage.read({
			scope: 'company-documents',
			key: stored.key,
		})
		expect([...bytes]).toEqual(raw)
	})

	it('stores a public image untouched with a direct url', async () => {
		const { provider, storage } = setup()

		const stored = await storage.upload({
			scope: 'user-avatar',
			entityId: 'u1',
			file: fileOf('me.png', PNG_HEADER),
		})

		expect(stored.url).toBe('memory://Users/u1/avatar')
		const object = provider.objects.get('Users/u1/avatar')!
		expect([...object.body]).toEqual(PNG_HEADER)
		expect(object.contentType).toBe('image/png')
	})

	it('re-validates on the server and rejects with 422', async () => {
		const { storage } = setup()
		await expect(
			storage.upload({
				scope: 'company-documents',
				entityId: 'c1',
				file: fileOf('foto.png', PNG_HEADER),
			})
		).rejects.toMatchObject({ name: 'StorageRequestError', status: 422 })
	})

	it('answers 404 for a scope that does not exist', async () => {
		const { storage } = setup()
		await expect(
			storage.upload({
				scope: 'nope',
				entityId: 'c1',
				file: fileOf('acta.pdf', PDF_HEADER),
			})
		).rejects.toBeInstanceOf(StorageRequestError)
	})
})

describe('createStorage — signed urls and deletion', () => {
	it('signs private objects and refuses to sign public ones', async () => {
		const { storage } = setup()
		const stored = await storage.upload({
			scope: 'company-documents',
			entityId: 'c1',
			file: fileOf('acta.pdf', PDF_HEADER),
		})

		await expect(
			storage.signedUrl({ scope: 'company-documents', key: stored.key })
		).resolves.toContain('expires=300')

		await expect(() =>
			storage.signedUrl({ scope: 'user-avatar', key: 'Users/u1/avatar' })
		).toThrow(ScopeError)
	})

	it('removes an object', async () => {
		const { provider, storage } = setup()
		const stored = await storage.upload({
			scope: 'company-documents',
			entityId: 'c1',
			file: fileOf('acta.pdf', PDF_HEADER),
		})

		await expect(
			storage.remove({ scope: 'company-documents', key: stored.key })
		).resolves.toBe(true)
		expect(provider.objects.has(stored.key)).toBe(false)
	})
})
