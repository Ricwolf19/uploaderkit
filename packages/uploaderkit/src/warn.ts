const seen = new Set<string>()

/**
 * Dev-only warning, once per `key` — for paths that run per render or per
 * file, where the same misconfiguration would otherwise print hundreds of
 * times. Same contract as listkit's `warnDev`.
 *
 * @see AGENTS.md §3.1 — this tier vs the `ScopeError` throw
 */
export const warnDev = (key: string, message: string): void => {
	if (process.env.NODE_ENV === 'production') return
	if (seen.has(key)) return
	seen.add(key)
	console.warn(`[uploaderkit] ${message}`)
}
