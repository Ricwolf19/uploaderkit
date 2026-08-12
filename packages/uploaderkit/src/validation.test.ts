import { describe, expect, it } from 'vitest'

import { MB } from './constants'
import { formatFileSize, getFileExtension, getMimeType } from './file'
import type { FileLike } from './types'
import { validateExtension, validateFile, validateSize } from './validation'

/** Minimal FileLike so tests run without a DOM. */
const fileOf = (
	name: string,
	bytes: number[] = [],
	size = bytes.length
): FileLike => ({
	name,
	size,
	type: getMimeType(name),
	arrayBuffer: async () => new Uint8Array(bytes).buffer,
})

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

describe('getFileExtension', () => {
	it('lowercases and ignores the path', () => {
		expect(getFileExtension('Factura.PDF')).toBe('pdf')
		expect(getFileExtension('archive.tar.gz')).toBe('gz')
	})

	it('returns empty for names without a usable extension', () => {
		expect(getFileExtension('README')).toBe('')
		expect(getFileExtension('.gitignore')).toBe('')
		expect(getFileExtension('trailing.')).toBe('')
	})
})

describe('formatFileSize', () => {
	it('scales to the largest fitting unit', () => {
		expect(formatFileSize(512)).toBe('512 B')
		expect(formatFileSize(1536)).toBe('1.5 KB')
		expect(formatFileSize(5 * MB)).toBe('5.0 MB')
	})
})

describe('validateSize', () => {
	it('rejects empty files', () => {
		expect(validateSize(0, MB)).toMatchObject({
			valid: false,
			code: 'empty-file',
		})
	})

	it('rejects files over the ceiling and names both sizes', () => {
		const result = validateSize(3 * MB, 2 * MB)
		expect(result.valid).toBe(false)
		if (!result.valid) {
			expect(result.code).toBe('too-large')
			expect(result.message).toContain('3.0 MB')
			expect(result.message).toContain('2.0 MB')
		}
	})

	it('accepts a file exactly at the ceiling', () => {
		expect(validateSize(2 * MB, 2 * MB).valid).toBe(true)
	})
})

describe('validateExtension', () => {
	it('accepts anything when the allow-list is empty', () => {
		expect(validateExtension('whatever.bin', []).valid).toBe(true)
	})

	it('rejects an extension outside the list', () => {
		expect(validateExtension('malware.exe', ['pdf'])).toMatchObject({
			valid: false,
			code: 'extension-not-allowed',
		})
	})

	it('is case-insensitive', () => {
		expect(validateExtension('Factura.PDF', ['pdf']).valid).toBe(true)
	})
})

describe('validateFile', () => {
	it('passes a well-formed file', async () => {
		const result = await validateFile(fileOf('doc.pdf', PDF_HEADER), {
			maxBytes: MB,
			allowedExtensions: ['pdf'],
			validateMagicNumbers: true,
		})
		expect(result.valid).toBe(true)
	})

	it('catches an executable renamed to .pdf', async () => {
		const result = await validateFile(
			fileOf('payload.pdf', [0x4d, 0x5a, 0x90]),
			{
				maxBytes: MB,
				allowedExtensions: ['pdf'],
				validateMagicNumbers: true,
			}
		)
		expect(result).toMatchObject({
			valid: false,
			code: 'magic-number-mismatch',
		})
	})

	it('checks size before reading any bytes', async () => {
		let read = false
		const huge: FileLike = {
			name: 'big.pdf',
			size: 900 * MB,
			type: 'application/pdf',
			arrayBuffer: async () => {
				read = true
				return new ArrayBuffer(0)
			},
		}

		const result = await validateFile(huge, {
			maxBytes: MB,
			allowedExtensions: ['pdf'],
			validateMagicNumbers: true,
		})

		expect(result).toMatchObject({ valid: false, code: 'too-large' })
		expect(read).toBe(false)
	})

	it('skips the header check for formats without a known signature', async () => {
		const result = await validateFile(fileOf('data.csv', [0x61, 0x2c, 0x62]), {
			maxBytes: MB,
			allowedExtensions: ['csv'],
			validateMagicNumbers: true,
		})
		expect(result.valid).toBe(true)
	})

	it('runs customValidation only after the built-in checks pass', async () => {
		let called = false
		const result = await validateFile(fileOf('logo.png', PNG_HEADER), {
			maxBytes: MB,
			allowedExtensions: ['png'],
			customValidation: async () => {
				called = true
				return { valid: false, code: 'custom', message: 'Nope' }
			},
		})

		expect(called).toBe(true)
		expect(result).toMatchObject({ valid: false, code: 'custom' })
	})
})
