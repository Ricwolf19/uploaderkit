import { describe, expect, it } from 'vitest'

import { MB } from './constants'
import type { ScopeConfig } from './defineScopes'
import {
	defineScopes,
	hasStableKey,
	resolveReplaceMode,
	resolveScopePrefix,
} from './defineScopes'
import { ScopeError } from './scopes'

const base = {
	visibility: 'private',
	accept: ['pdf'],
	maxBytes: 1 * MB,
} satisfies Omit<ScopeConfig, 'path'>

describe('resolveReplaceMode', () => {
	it('sweeps the entity when the key carries the file name', () => {
		const scope = {
			...base,
			path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
		}
		expect(resolveReplaceMode(scope)).toBe('entity')
	})

	it('only overwrites the key when the path ignores the file name', () => {
		// Nothing to sweep: the provider replaces the object in place, so the
		// extra list call per upload would buy nothing.
		const scope = { ...base, path: (id: string) => `X/${id}/single.pdf` }
		expect(hasStableKey(scope)).toBe(true)
		expect(resolveReplaceMode(scope)).toBe('key')
	})

	it('keeps siblings when the scope holds a collection', () => {
		const scope = {
			...base,
			maxFiles: 10,
			path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
		}
		expect(resolveReplaceMode(scope)).toBe('key')
	})

	it('lets a scope opt out of every sweep', () => {
		const scope = {
			...base,
			replace: false as const,
			path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
		}
		expect(resolveReplaceMode(scope)).toBe(false)
	})
})

describe('resolveScopePrefix', () => {
	it('defaults to the folder of the resolved key', () => {
		const scope = {
			...base,
			path: (id: string, file: { name: string }) => `X/${id}/docs/${file.name}`,
		}
		expect(resolveScopePrefix(scope, 'abc')).toBe('X/abc/docs')
	})

	it('honours an explicit prefix', () => {
		const scope = {
			...base,
			prefix: (id: string) => `X/${id}/only-here`,
			path: (id: string, file: { name: string }) =>
				`X/${id}/only-here/${file.name}`,
		}
		expect(resolveScopePrefix(scope, 'abc')).toBe('X/abc/only-here')
	})
})

describe('defineScopes validation', () => {
	it('rejects an entity-wide replace on a collection', () => {
		expect(() =>
			defineScopes({
				expediente: {
					...base,
					maxFiles: 10,
					replace: 'entity',
					path: (id: string, file: { name: string }) => `X/${id}/${file.name}`,
				},
			})
		).toThrow(ScopeError)
	})

	it('rejects a non-positive maxFiles', () => {
		expect(() =>
			defineScopes({
				bad: { ...base, maxFiles: 0, path: (id: string) => `X/${id}/a.pdf` },
			})
		).toThrow(/positive integer/)
	})

	it('rejects a sweep that would reach another scope', () => {
		// `avatar` would sweep `Users/{id}`, which also holds `docs`.
		expect(() =>
			defineScopes({
				avatar: {
					...base,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/${file.name}`,
				},
				docs: {
					...base,
					maxFiles: 5,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/docs/${file.name}`,
				},
			})
		).toThrow(/would sweep/)
	})

	it('accepts sibling folders under the same entity', () => {
		expect(() =>
			defineScopes({
				identity: {
					...base,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/identity/${file.name}`,
				},
				docs: {
					...base,
					maxFiles: 5,
					path: (id: string, file: { name: string }) =>
						`Users/${id}/docs/${file.name}`,
				},
			})
		).not.toThrow()
	})

	it('rejects an entity sweep rooted at the bucket', () => {
		expect(() =>
			defineScopes({
				loose: {
					...base,
					path: (_id: string, file: { name: string }) => file.name,
				},
			})
		).toThrow(/bucket-root/)
	})

	it('still runs the core validations', () => {
		expect(() =>
			defineScopes({
				empty: { ...base, accept: [], path: (id: string) => `X/${id}/a.pdf` },
			})
		).toThrow(ScopeError)
	})
})
