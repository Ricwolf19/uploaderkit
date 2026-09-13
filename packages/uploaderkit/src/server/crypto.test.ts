import { describe, expect, it } from 'vitest'

import { ScopeError } from '../scopes'
import { createAesGcmCrypto } from './crypto'

const KEY = 'a'.repeat(64)

describe('createAesGcmCrypto', () => {
	it('round-trips a binary', async () => {
		const crypto = createAesGcmCrypto(KEY)
		const raw = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3])
		const encrypted = await crypto.encrypt(raw)
		expect([...encrypted]).not.toEqual([...raw])
		expect([...(await crypto.decrypt(encrypted))]).toEqual([...raw])
	})

	it('rejects a tampered ciphertext (GCM auth)', async () => {
		const crypto = createAesGcmCrypto(KEY)
		const encrypted = Buffer.from(
			await crypto.encrypt(new Uint8Array([1, 2, 3]))
		)
		encrypted[encrypted.length - 1]! ^= 0xff
		await expect(async () => crypto.decrypt(encrypted)).rejects.toThrow()
	})

	it('refuses anything that is not 64 hex chars', () => {
		expect(() => createAesGcmCrypto('secreto')).toThrow(ScopeError)
		expect(() => createAesGcmCrypto('a'.repeat(63))).toThrow(ScopeError)
	})

	it('different keys cannot read each other', async () => {
		const a = createAesGcmCrypto(KEY)
		const b = createAesGcmCrypto('b'.repeat(64))
		const encrypted = await a.encrypt(new Uint8Array([9, 9]))
		await expect(async () => b.decrypt(encrypted)).rejects.toThrow()
	})
})
