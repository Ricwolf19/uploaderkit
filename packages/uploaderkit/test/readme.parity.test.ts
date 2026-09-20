import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The two READMEs must stay structurally parallel: thekits.dev generates its
 * docs from them and joins Spanish to English **by position**, since translated
 * heading text cannot be the join key. A section added to one file and not the
 * other silently shifts every later page. This has already happened once.
 */
const read = (file: string) =>
	readFileSync(path.join(process.cwd(), file), 'utf8')

type Heading = { level: number; text: string; line: number }

/** Both files contain `# peers` inside a bash fence — hence the fence guard. */
const headings = (markdown: string): Heading[] => {
	const out: Heading[] = []
	let fence: string | null = null
	markdown.split('\n').forEach((line, i) => {
		const open = /^\s*(```|~~~)/.exec(line)
		if (fence) {
			if (open && line.trim().startsWith(fence)) fence = null
			return
		}
		if (open) {
			fence = open[1]
			return
		}
		const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line)
		if (match)
			out.push({ level: match[1].length, text: match[2].trim(), line: i + 1 })
	})
	return out
}

describe('README / README.es parity', () => {
	const en = headings(read('README.md'))
	const es = headings(read('README.es.md'))

	it('has the same number of headings in both languages', () => {
		expect(es).toHaveLength(en.length)
	})

	it('has an identical heading-depth sequence', () => {
		// Depth, not text: the text is translated. Depth is what the positional
		// join depends on.
		expect(es.map(h => h.level)).toEqual(en.map(h => h.level))
	})

	it('names no heading twice, so each can be claimed unambiguously', () => {
		for (const list of [en, es]) {
			const texts = list.map(h => h.text)
			expect(new Set(texts).size).toBe(texts.length)
		}
	})

	it('opens with a single H1 followed by a table of contents', () => {
		for (const list of [en, es]) {
			expect(list.filter(h => h.level === 1)).toHaveLength(1)
			expect(list[0]?.level).toBe(1)
			expect(list[1]?.level).toBe(2)
		}
	})
})
