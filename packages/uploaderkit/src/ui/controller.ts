import type { StoredFile } from '../types'
/**
 * When a styled uploader sends, as the three flows every product screen falls
 * into — named at the UI level so a call site declares its intent instead of
 * assembling it from `uploadOn` + button + controller by hand:
 *
 * - `'select'` — fires the moment a valid file lands. Avatars, quick
 *   replacements: surfaces where the file IS the action and there is nothing
 *   else to wait for.
 * - `'submit'` — staged until the surrounding form sends it through
 *   `controllerRef`, together with the rest of the fields. The only correct
 *   mode when the record the file belongs to does not exist yet, or when a
 *   stable-key scope would overwrite what the entity serves before the user
 *   confirmed anything.
 * - `'manual'` — staged, and the zone shows its own upload button: the user
 *   drops files and decides the moment. Evidence and other punctual flows
 *   with no form around them.
 *
 * The hook underneath only knows `'select' | 'manual'` (fire now vs wait for
 * `upload()`): `'submit'` and `'manual'` are the same machine state with a
 * different owner of the send — the form or the zone.
 */
export type UiUploadTrigger = 'select' | 'submit' | 'manual'

/**
 * What a surrounding form needs to send the staged files from its own submit —
 * the flow `uploadOn: 'manual'` exists for, where the file travels together
 * with the rest of the fields instead of the moment it is picked.
 *
 * A ref rather than a callback prop: the form reads it inside its submit
 * handler, and a controller passed down would re-render the zone on every
 * keystroke elsewhere in the form.
 *
 * @see AGENTS.md §3 — "Arity lives on the scope", same reasoning one level up
 */
export type UploaderController<TResult = StoredFile[]> = {
	/** Uploads everything still waiting. Resolves with what the server confirmed. */
	upload: () => Promise<TResult>
	/** `true` while a file waits for `upload()`. */
	hasPending: boolean
	isUploading: boolean
}

/** Slots settle through `onChange`, so the batch itself resolves with nothing. */
export type SlottedUploaderController = UploaderController<void>

/**
 * Structural rather than React's `RefObject`: that type is read-only under the
 * v18 typings and writable under v19, and the package supports both.
 * `useRef<UploaderController | null>(null)` satisfies it either way.
 */
export type UploaderControllerRef<TResult = StoredFile[]> = {
	current: UploaderController<TResult> | null
}
