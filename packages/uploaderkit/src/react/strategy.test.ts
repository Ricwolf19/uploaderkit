import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRemoveStrategy } from './strategy'

afterEach(() => vi.unstubAllGlobals())

const stored = {
	key: 'Customers/RFC/identity/logo.png',
	url: 'u',
	scope: 'customer-identity',
	entityId: 'RFC',
	fileName: 'logo.png',
	mimeType: 'image/png',
	size: 1,
	uploadedAt: 1,
}

describe('createRemoveStrategy', () => {
	it('DELETEs the mirror of the upload route with the key as JSON', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ deleted: true }),
		})
		vi.stubGlobal('fetch', fetchMock)

		const remove = createRemoveStrategy({
			endpoint: 'https://api.test/storage/',
			credentials: 'include',
			headers: () => ({ Authorization: 'Bearer t' }),
		})
		const deleted = await remove(stored, 'customer-identity', 'RFC')

		expect(deleted).toBe(true)
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.test/storage/customer-identity/RFC',
			{
				method: 'DELETE',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer t',
				},
				body: JSON.stringify({ key: stored.key }),
			}
		)
	})

	it('reports false when the server refuses — a keepOnRemove scope answers so', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ deleted: false }),
			})
		)

		const remove = createRemoveStrategy({
			endpoint: 'https://api.test/storage',
		})

		await expect(remove(stored, 's', 'e')).resolves.toBe(false)
	})

	it('reports false on a non-2xx without throwing', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
		)

		const remove = createRemoveStrategy({
			endpoint: 'https://api.test/storage',
		})

		await expect(remove(stored, 's', 'e')).resolves.toBe(false)
	})
})
