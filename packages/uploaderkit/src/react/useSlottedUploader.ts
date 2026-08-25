import { useCallback, useMemo, useRef } from 'react'

import type { ExtendedScopeRegistry, ScopeConfig } from '../defineScopes'
import { resolveReplaceMode } from '../defineScopes'
import { getFileExtension, toAcceptAttribute } from '../file'
import type { UploaderLabels } from '../labels'
import { ScopeError } from '../scopes'
import type { FileExtension } from '../types'
import { warnDev } from '../warn'
import {
	matchSlotByExtension,
	matchSlotByName,
	type SlotDefinition,
	slotFileName,
	type SlotMatcher,
	type SlottedFile,
} from './slots'
import type { RemoveStrategy, UploaderFile, UploadStrategy } from './types'
import { useUploaderLabels } from './UploaderProvider'
import {
	type RetryOptions,
	type UploadTrigger,
	useUploader,
} from './useUploader'

export type UseSlottedUploaderOptions<T extends Record<string, ScopeConfig>> = {
	scopes: ExtendedScopeRegistry<T>
	scope: keyof T & string
	entityId: string
	strategy?: UploadStrategy
	/**
	 * Deletion transport. With it, a confirmed `removeSlot` deletes the object
	 * from storage BY ITSELF — unless the scope is `keepOnRemove`, the history
	 * contract — so no consumer can orphan by forgetting a callback.
	 * `onRemoveStored` still fires for the app's own bookkeeping.
	 */
	removeStrategy?: RemoveStrategy
	slots: SlotDefinition[]
	/** Currently persisted files. The caller owns persistence — controlled. */
	value: SlottedFile[]
	/** Called with the next full set after an upload lands or a slot empties. */
	onChange: (next: SlottedFile[]) => void | Promise<void>
	/** How dropped files find their slot. @defaultValue 'extension' */
	matchBy?: 'extension' | 'name'
	/** Custom matcher for special rules; overrides `matchBy`. */
	match?: SlotMatcher
	/** @defaultValue 'select' — a slot names its file, so it usually travels at once. */
	uploadOn?: UploadTrigger
	/** Fired when a batch starts travelling. Same contract as `useUploader`. */
	onUploadStart?: (files: UploaderFile[]) => void
	/**
	 * Fired with the PERSISTED file a `removeSlot` just forgot, before
	 * `onChange` delivers the filtered set. This is where the app deletes the
	 * object from storage — without it the consumer had to diff old-vs-new
	 * arrays to even learn which key vanished, and every stable-key scope
	 * orphaned on remove.
	 */
	onRemoveStored?: (stored: SlottedFile) => void
	onError?: (message: string) => void
	/** Forwarded to the underlying `useUploader`. */
	retry?: number | RetryOptions
	/** Forwarded to the underlying `useUploader`. */
	concurrency?: number
	labels?: Partial<UploaderLabels>
}

export type SlotState = {
	definition: SlotDefinition
	/** Persisted file occupying the slot, if any. */
	filled?: SlottedFile
	/** In-flight or failed upload for the slot, if any. */
	pending?: UploaderFile
}

export type UseSlottedUploaderReturn = {
	slots: SlotState[]
	/** `<input accept>` derived from the union of the slots' extensions. */
	accept: string
	isUploading: boolean
	/** Route a dropped/browsed batch to slots via the matcher. */
	addFiles: (incoming: FileList | File[]) => Promise<void>
	/** Put one file in one specific slot (per-row browse button). */
	addToSlot: (slotId: string, file: File) => Promise<void>
	/**
	 * Forget the persisted file of a slot. Remote deletion stays the app's
	 * call — made through `onRemoveStored`, which receives the forgotten file.
	 */
	removeSlot: (slotId: string) => void
	abort: (slotId?: string) => void
	/** Uploads every slot still holding an `idle` file (`uploadOn: 'manual'`). */
	upload: () => Promise<void>
	/** `true` while any slot holds an `idle` file waiting for `upload()`. */
	hasPending: boolean
}

/**
 * Named-slot collection over the SAME machine as the plain uploader: this hook
 * only decides *which slot* a file lands in and renames it to `{slot}.{ext}`;
 * validation, compression, progress and abort are `useUploader` verbatim. One
 * behavior, two presentations — a fix in the machine reaches both.
 */
export const useSlottedUploader = <T extends Record<string, ScopeConfig>>({
	scopes,
	scope,
	entityId,
	strategy,
	slots,
	value,
	onChange,
	matchBy = 'extension',
	match,
	uploadOn = 'select',
	onUploadStart,
	removeStrategy,
	onRemoveStored,
	onError,
	retry,
	concurrency,
	labels,
}: UseSlottedUploaderOptions<T>): UseSlottedUploaderReturn => {
	const copy = useUploaderLabels(labels)
	// Impossible configs throw, "will fail at upload time" configs warn once.
	// See AGENTS.md §3.1.
	useMemo(() => {
		const ids = new Set<string>()
		for (const slot of slots) {
			if (ids.has(slot.id)) {
				throw new ScopeError(
					`useSlottedUploader: duplicate slot id "${slot.id}" — slot ids are storage keys and must be unique`
				)
			}
			ids.add(slot.id)
		}
		// A slot per position means the scope holds several files at once, so a
		// sweep would delete the sibling slots on every upload — silently, and
		// only in production. Same tier as a duplicate slot id: it can never
		// work, so it fails at import.
		if (
			slots.length > 1 &&
			resolveReplaceMode(scopes.get(scope)) === 'entity'
		) {
			throw new ScopeError(
				`useSlottedUploader: scope "${scope}" replaces per entity, so filling one of its ` +
					`${slots.length} slots would delete the others. Declare "maxFiles" on the scope ` +
					"(one per slot, at least), or set replace: 'key'."
			)
		}

		const accepted = scopes.get(scope).accept
		for (const slot of slots) {
			const outside = slot.extensions.filter(
				extension => !accepted.includes(extension)
			)
			if (outside.length > 0) {
				warnDev(
					`slot-outside-scope:${slot.id}`,
					`slot "${slot.id}" accepts ${outside.join(', ')} but scope "${scope}" does not — those uploads will be rejected by validation. Align the slot's extensions with the scope's accept list.`
				)
			}
		}
	}, [slots, scopes, scope])

	// Latest persisted set, readable from inside onUploaded without re-binding
	// the uploader callbacks on every render.
	const valueRef = useRef(value)
	valueRef.current = value
	const onChangeRef = useRef(onChange)
	onChangeRef.current = onChange

	// Uploads the parent has not absorbed into `value` yet. Two quick drops
	// would otherwise race the controlled state: the second onChange reads a
	// `value` that misses the first drop's entry and silently loses it.
	const landedRef = useRef(new Map<string, SlottedFile>())
	for (const [slot, item] of landedRef.current) {
		const absorbed = value.some(
			entry =>
				entry.slot === slot &&
				entry.stored.key === item.stored.key &&
				entry.stored.uploadedAt === item.stored.uploadedAt
		)
		if (absorbed) landedRef.current.delete(slot)
	}

	const uploader = useUploader({
		scopes,
		scope,
		entityId,
		strategy,
		multiple: true,
		uploadOn,
		onUploadStart,
		onError,
		...(retry !== undefined ? { retry } : {}),
		...(concurrency !== undefined ? { concurrency } : {}),
		...(labels ? { labels } : {}),
		onUploaded: stored => {
			// Files were renamed to `{slot}.{ext}` before entering the machine, so
			// the slot is recoverable from the confirmed name.
			for (const item of stored) {
				const slot = slots.find(s => item.fileName.startsWith(`${s.id}.`))
				if (slot)
					landedRef.current.set(slot.id, { slot: slot.id, stored: item })
			}
			const merged = new Map(valueRef.current.map(entry => [entry.slot, entry]))
			landedRef.current.forEach((entry, slot) => merged.set(slot, entry))
			void onChangeRef.current([...merged.values()])
		},
	})

	const resolveSlot = useMemo<SlotMatcher>(() => {
		if (match) return match
		if (matchBy === 'name') return matchSlotByName
		return (all, fileName) =>
			matchSlotByExtension(new Set(valueRef.current.map(item => item.slot)))(
				all,
				fileName
			)
	}, [match, matchBy])

	// Renames a file after its slot, or reports why it cannot fill it.
	const assign = useCallback(
		(slotId: string, file: File): File | null => {
			const slot = slots.find(s => s.id === slotId)
			if (!slot) return null

			const extension = getFileExtension(file.name) as FileExtension
			if (!slot.extensions.includes(extension)) {
				onError?.(copy.slotFormatNotAllowed(slot.label, slot.extensions))
				return null
			}
			return new File([file], slotFileName(slotId, file.name), {
				type: file.type,
			})
		},
		[slots, onError, copy]
	)

	const addToSlot = useCallback(
		async (slotId: string, file: File) => {
			const renamed = assign(slotId, file)
			if (renamed) await uploader.addFiles([renamed])
		},
		[assign, uploader]
	)

	const addFiles = useCallback(
		async (incoming: FileList | File[]) => {
			// One batch for the whole drop: a single onUploaded → a single
			// onChange carrying every slot that landed.
			const batch: File[] = []
			for (const file of Array.from(incoming)) {
				const slotId = resolveSlot(slots, file.name)
				if (!slotId) {
					onError?.(copy.fileWithoutSlot(file.name))
					continue
				}
				const renamed = assign(slotId, file)
				if (renamed) batch.push(renamed)
			}
			if (batch.length > 0) await uploader.addFiles(batch)
		},
		[slots, resolveSlot, assign, uploader, onError, copy]
	)

	const removeSlot = useCallback(
		(slotId: string) => {
			// Drop any in-flight attempt for the slot too, or a slow upload would
			// resurrect the file the user just removed.
			uploader.files
				.filter(file => file.file.name.startsWith(`${slotId}.`))
				.forEach(file => uploader.removeFile(file.id))
			landedRef.current.delete(slotId)
			const forgotten = valueRef.current.find(item => item.slot === slotId)
			if (forgotten) {
				// The package deletes; the app only observes. Fire-and-forget
				// with the reference ordering: forget the reference regardless,
				// because a dangling pointer is worse than an orphan — and
				// surface a refused delete instead of swallowing it.
				if (removeStrategy && !scopes.get(scope).keepOnRemove) {
					removeStrategy(forgotten.stored, scope, entityId)
						.then(deleted => {
							if (!deleted) onError?.(copy.removeFailed)
						})
						.catch(() => onError?.(copy.removeFailed))
				}
				onRemoveStored?.(forgotten)
			}
			void onChangeRef.current(
				valueRef.current.filter(item => item.slot !== slotId)
			)
		},
		[
			uploader,
			removeStrategy,
			scopes,
			scope,
			entityId,
			onRemoveStored,
			onError,
			copy,
		]
	)

	const abort = useCallback(
		(slotId?: string) => {
			if (!slotId) {
				uploader.abort()
				return
			}
			uploader.files
				.filter(file => file.file.name.startsWith(`${slotId}.`))
				.forEach(file => uploader.abort(file.id))
		},
		[uploader]
	)

	const slotStates = useMemo<SlotState[]>(
		() =>
			slots.map(definition => ({
				definition,
				filled: value.find(item => item.slot === definition.id),
				pending: uploader.files.find(
					file =>
						file.file.name.startsWith(`${definition.id}.`) &&
						file.status !== 'success'
				),
			})),
		[slots, value, uploader.files]
	)

	const accept = useMemo(
		() => toAcceptAttribute([...new Set(slots.flatMap(s => s.extensions))]),
		[slots]
	)

	const upload = useCallback(async () => {
		await uploader.upload()
	}, [uploader])

	return {
		slots: slotStates,
		accept,
		isUploading: uploader.isUploading,
		hasPending: uploader.hasPending,
		addFiles,
		addToSlot,
		removeSlot,
		abort,
		upload,
	}
}
