import { ScopeError } from './scopes'
import type { FileLike, ScopeConfig, ScopeRegistry } from './types'
/** Longest stem kept. Object stores cap the whole key and the prefix spends part of it. */
const MAX_STEM_LENGTH = 80

/** What an all-punctuation name degrades to, so a key never ends in a bare dot. */
const FALLBACK_STEM = 'archivo'

const slugSegment = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

/**
 * Turns a user's file name into a safe key segment: ASCII, lower case, one
 * extension, no path syntax.
 *
 * Call it INSIDE your scope's `path()`, not around it:
 *
 * ```ts
 * path: (id, file) => `Docs/${id}/${sanitizeFileName(file.name)}`
 * ```
 *
 * `resolveKey` deliberately does not apply it for you. It would rewrite the key
 * your `path()` returned, and a client computing the same key to decide replace
 * mode would then disagree with the server. Inside `path()` both sides run the
 * one function and cannot drift.
 *
 * This exists because a macOS screenshot took an API down. `Screenshot
 * 2026-08-31 at 4.18.54 p.m..png` ends in `p.m.` + `.png`, so the raw name
 * carries `..`; the traversal guard rejected the key and the consumer dropped
 * the rejection, killing the process.
 *
 * Only the KEY is slugged — keep the original in `StoredFile.fileName`, which
 * is what a UI should render.
 */
export const sanitizeFileName = (fileName: string): string => {
	// A name arriving as a path is already an attempt, deliberate or not.
	const base = fileName.split(/[/\\]/).pop() ?? ''

	const dot = base.lastIndexOf('.')
	// A leading dot is a dotfile, not an extension: `.env` has no stem.
	const hasExtension = dot > 0
	const stem = slugSegment(hasExtension ? base.slice(0, dot) : base).slice(
		0,
		MAX_STEM_LENGTH
	)
	const extension = hasExtension ? slugSegment(base.slice(dot + 1)) : ''

	// A trailing `-` can reappear when the length cut lands mid-separator.
	const safeStem = stem.replace(/-+$/, '') || FALLBACK_STEM

	return extension ? `${safeStem}.${extension}` : safeStem
}

/**
 * Whether a key would escape its own prefix.
 *
 * Judged per SEGMENT. The core's `key.includes('..')` reads as the same check
 * and is not: `report..pdf` and `Screenshot at 4.18.54 p.m..png` carry two dots
 * without ever being traversal, and a macOS screenshot is the common case, not
 * a corner one. Traversal needs a segment that IS `..`, so that is what this
 * asks.
 */
const escapesPrefix = (key: string): boolean =>
	key.startsWith('/') ||
	key.split('/').some(segment => segment === '..' || segment === '.')

/**
 * `resolveKey` with the traversal guard judged by path segment.
 *
 * Shadows the core export (see the note in `index.ts`): same signature, same
 * `ScopeError`, only the false positives are gone. Pair it with
 * {@link sanitizeFileName} in `path()` — this is the backstop, not the fix.
 */
export const resolveKey = <T extends Record<string, ScopeConfig>>(
	registry: ScopeRegistry<T>,
	name: string,
	entityId: string,
	file: FileLike
): string => {
	const key = registry.get(name).path(entityId, file)
	if (escapesPrefix(key)) {
		throw new ScopeError(`Scope "${name}" produced an unsafe key: ${key}`)
	}
	return key
}
