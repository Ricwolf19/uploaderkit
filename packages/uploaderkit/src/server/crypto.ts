import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { ScopeError } from '../scopes'
import type { CryptoHooks } from '../types'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_PATTERN = /^[0-9a-fA-F]{64}$/

/**
 * Reference cipher for `encrypt: true` scopes: AES-256-GCM, layout
 * `[iv 12][auth tag 16][ciphertext]`. Injecting different {@link CryptoHooks}
 * into `createStorage` stays fully supported.
 *
 * The key must be exactly 64 hex chars — no passphrase derivation, so two
 * instances can never run "almost the same" secret and silently write
 * mutually unreadable files. `openssl rand -hex 32`.
 *
 * @see AGENTS.md §4.4
 */
export const createAesGcmCrypto = (hexKey: string): CryptoHooks => {
	if (!KEY_PATTERN.test(hexKey)) {
		throw new ScopeError(
			'createAesGcmCrypto: the key must be exactly 64 hex characters (32 bytes). Generate one with `openssl rand -hex 32`.'
		)
	}
	const key = Buffer.from(hexKey, 'hex')

	return {
		encrypt: data => {
			const iv = randomBytes(IV_LENGTH)
			const cipher = createCipheriv('aes-256-gcm', key, iv)
			const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
			return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
		},
		decrypt: data => {
			const buffer = Buffer.from(data)
			const iv = buffer.subarray(0, IV_LENGTH)
			const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
			const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH)
			const decipher = createDecipheriv('aes-256-gcm', key, iv)
			decipher.setAuthTag(tag)
			return Buffer.concat([decipher.update(ciphertext), decipher.final()])
		},
	}
}
