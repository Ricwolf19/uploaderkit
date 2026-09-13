import { createContext, type ReactNode, useContext, useMemo } from 'react'

import {
	DEFAULT_LABELS,
	ES_LABELS,
	resolveLabels,
	type UploaderLabels,
} from '../labels'

const LabelsContext = createContext<UploaderLabels>(DEFAULT_LABELS)

/** The two built-in copy sets. */
export type UploaderLanguage = 'en' | 'es'

export type UploaderProviderProps = {
	children: ReactNode
	/**
	 * Which built-in copy set every uploader under it speaks. English is the
	 * default so the kit ships globalized; a Spanish app opts in ONCE here
	 * instead of passing `labels` to each component.
	 * @defaultValue 'en'
	 */
	language?: UploaderLanguage
	/** Per-key overrides on top of the selected language. */
	labels?: Partial<UploaderLabels>
}

/**
 * Optional app-root provider carrying the copy. Components work without it
 * (they fall back to {@link DEFAULT_LABELS}), and a per-component `labels`
 * prop still wins for one-off rewording.
 */
export const UploaderProvider = ({
	children,
	language = 'en',
	labels,
}: UploaderProviderProps) => {
	const value = useMemo(
		() => resolveLabels(labels, language === 'es' ? ES_LABELS : DEFAULT_LABELS),
		[language, labels]
	)

	return (
		<LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
	)
}

/**
 * The active copy, merged: provider base ← per-call `overrides`. What every
 * component and hook in the package reads instead of `resolveLabels` directly,
 * so a single provider re-words all of them at once.
 */
export const useUploaderLabels = (
	overrides?: Partial<UploaderLabels>
): UploaderLabels => {
	const base = useContext(LabelsContext)
	return useMemo(
		() => (overrides ? { ...base, ...overrides } : base),
		[base, overrides]
	)
}
