import { getFileExtension } from '../file'
import type { FileExtension, StoredFile } from '../types'
/** A named position a single file can fill (letterhead, CSF, acta, …). */
export type SlotDefinition = {
	/** Canonical id — becomes the stored file name (`{id}.{ext}`), so the
	 * scope's `path` yields a stable key and re-uploads overwrite. */
	id: string
	/** Human label shown in the row. */
	label: string
	/** Lower-case extensions this slot takes. Narrower than the scope, never wider. */
	extensions: FileExtension[]
	hint?: string
}

/** A stored file tagged with the slot it fills. The app persists these. */
export type SlottedFile = {
	slot: string
	stored: StoredFile
}

/** Resolves which slot an incoming file belongs to, or `null` for none. */
export type SlotMatcher = (
	slots: SlotDefinition[],
	fileName: string
) => string | null

/**
 * Default matcher: the file's extension picks the slot. Prefers an empty slot
 * so dropping three files fills three positions; falls back to the first
 * extension match, which reads as "replace what is there".
 */
export const matchSlotByExtension =
	(filled: ReadonlySet<string>): SlotMatcher =>
	(slots, fileName) => {
		const extension = getFileExtension(fileName) as FileExtension
		const candidates = slots.filter(slot => slot.extensions.includes(extension))
		if (candidates.length === 0) return null
		return (candidates.find(slot => !filled.has(slot.id)) ?? candidates[0]!).id
	}

/** Matcher for uploads named after their slot (`letterhead-a4.pdf` → slot `letterhead-a4`). */
export const matchSlotByName: SlotMatcher = (slots, fileName) => {
	const base = fileName.toLowerCase()
	return slots.find(slot => base.startsWith(slot.id.toLowerCase()))?.id ?? null
}

/** The name a file adopts when it fills a slot. */
export const slotFileName = (slotId: string, originalName: string): string =>
	`${slotId}.${getFileExtension(originalName)}`

/** The slot a stored file fills, recovered from its name. `null` when foreign. */
export const slotOfStored = (
	slots: SlotDefinition[],
	stored: StoredFile
): string | null =>
	slots.find(slot => stored.fileName.startsWith(`${slot.id}.`))?.id ?? null
