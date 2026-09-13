// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MB } from '../constants'
import { defineScopes } from '../scopes'
import type { StoredFile } from '../types'
import {
	matchSlotByExtension,
	type SlotDefinition,
	slotFileName,
} from './slots'
import type { UploadStrategy } from './types'
import { useSlottedUploader } from './useSlottedUploader'

const scopes = defineScopes({
	identity: {
		path: (id, file) => `Companies/${id}/identity/${file.name}`,
		visibility: 'public',
		accept: ['pdf', 'png', 'svg'],
		maxBytes: MB,
	},
})

const slots: SlotDefinition[] = [
	{ id: 'letterhead', label: 'Hoja membretada', extensions: ['pdf'] },
	{ id: 'logo', label: 'Logo', extensions: ['png', 'svg'] },
]

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])
const PNG_HEADER = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

// The strategy the machine calls — echoes the (already renamed) file back.
const strategy: UploadStrategy = async (file, scope, entityId) => ({
	key: `Companies/${entityId}/identity/${file.name}`,
	url: `memory://${file.name}`,
	scope,
	entityId,
	fileName: file.name,
	mimeType: file.type,
	size: file.size,
	uploadedAt: 1,
})

describe('slot helpers', () => {
	it('renames a file after its slot, keeping the extension', () => {
		expect(slotFileName('letterhead', 'Membrete FINAL v3.pdf')).toBe(
			'letterhead.pdf'
		)
	})

	it('extension matcher prefers an empty slot and falls back to replace', () => {
		const empty = matchSlotByExtension(new Set())
		expect(empty(slots, 'algo.pdf')).toBe('letterhead')
		expect(empty(slots, 'logo.png')).toBe('logo')
		expect(empty(slots, 'video.mp4')).toBeNull()

		const allFilled = matchSlotByExtension(new Set(['letterhead', 'logo']))
		expect(allFilled(slots, 'otro.pdf')).toBe('letterhead')
	})
})

describe('useSlottedUploader', () => {
	it('routes a mixed drop to its slots through the shared machine', async () => {
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useSlottedUploader({
				scopes,
				scope: 'identity',
				entityId: 'c1',
				strategy,
				slots,
				value: [],
				onChange,
			})
		)

		expect(result.current.accept).toBe('.pdf,.png,.svg')

		await act(() =>
			result.current.addFiles([
				new File([PDF_HEADER], 'membrete.pdf', { type: 'application/pdf' }),
				new File([PNG_HEADER], 'marca.png', { type: 'image/png' }),
			])
		)

		// One onChange per landed upload; the last call carries both slots.
		const next = onChange.mock.lastCall![0] as {
			slot: string
			stored: StoredFile
		}[]
		expect(next.map(item => item.slot).sort()).toEqual(['letterhead', 'logo'])
		expect(next.find(item => item.slot === 'letterhead')!.stored.fileName).toBe(
			'letterhead.pdf'
		)
	})

	it('rejects a file whose slot does not take its extension', async () => {
		const onError = vi.fn()
		const { result } = renderHook(() =>
			useSlottedUploader({
				scopes,
				scope: 'identity',
				entityId: 'c1',
				strategy,
				slots,
				value: [],
				onChange: vi.fn(),
				onError,
			})
		)

		await act(() =>
			result.current.addToSlot(
				'letterhead',
				new File([PNG_HEADER], 'foto.png', { type: 'image/png' })
			)
		)

		expect(onError).toHaveBeenCalledWith(
			expect.stringContaining('Hoja membretada')
		)
	})

	it('replacing a filled slot swaps the entry instead of appending', async () => {
		const existing = {
			slot: 'letterhead',
			stored: {
				key: 'Companies/c1/identity/letterhead.pdf',
				url: 'memory://old',
				scope: 'identity',
				entityId: 'c1',
				fileName: 'letterhead.pdf',
				mimeType: 'application/pdf',
				size: 6,
				uploadedAt: 1,
			},
		}
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useSlottedUploader({
				scopes,
				scope: 'identity',
				entityId: 'c1',
				strategy,
				slots,
				value: [existing],
				onChange,
			})
		)

		await act(() =>
			result.current.addToSlot(
				'letterhead',
				new File([PDF_HEADER], 'nuevo.pdf', { type: 'application/pdf' })
			)
		)

		const next = onChange.mock.lastCall![0] as (typeof existing)[]
		expect(next).toHaveLength(1)
		expect(next[0]!.stored.url).toBe('memory://letterhead.pdf')
	})

	it('removeSlot empties the slot and reports the rest', () => {
		const value = [
			{
				slot: 'logo',
				stored: {
					key: 'k',
					url: 'u',
					scope: 'identity',
					entityId: 'c1',
					fileName: 'logo.png',
					mimeType: 'image/png',
					size: 1,
					uploadedAt: 1,
				},
			},
		]
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useSlottedUploader({
				scopes,
				scope: 'identity',
				entityId: 'c1',
				slots,
				value,
				onChange,
			})
		)

		expect(result.current.slots[1]!.filled).toBeDefined()
		act(() => result.current.removeSlot('logo'))
		expect(onChange).toHaveBeenCalledWith([])
	})
})
