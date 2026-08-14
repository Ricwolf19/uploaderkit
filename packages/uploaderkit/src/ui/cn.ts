/** Minimal class joiner — the package has no runtime deps to spend on clsx. */
export const cn = (...values: (string | false | null | undefined)[]): string =>
	values.filter(Boolean).join(' ')
