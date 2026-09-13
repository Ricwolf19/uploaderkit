import type { ScopeRegistry, StoredFile } from 'uploaderkit'
import type { UploadStrategy } from 'uploaderkit/react'

import type { FakeBucket } from './fakeBucket'

export type FakeStrategyOptions = {
	/** Total simulated duration, ms. @defaultValue 1600 */
	duration?: number
	/** Reject every upload with this message, to demo the error path. */
	failWith?: string
	/** Fail the first N attempts per file, then succeed — the retry demo. */
	failTimes?: number
	/**
	 * Resolve keys through the registry and apply the scope's replace mode, so
	 * a demo can show what the bucket really holds. Without it the strategy
	 * invents a key and no sweep is ever visible.
	 */
	bucket?: { store: FakeBucket; scopes: ScopeRegistry<never> }
}

/**
 * Simulated transport so every demo runs without a server: ticks progress,
 * honors abort, and answers a StoredFile like the real router would.
 */
export const createFakeStrategy = ({
	duration = 1600,
	failWith,
	failTimes = 0,
	bucket,
}: FakeStrategyOptions = {}): UploadStrategy => {
	const attempts = new Map<string, number>()

	return (file, scope, entityId, { onProgress, signal }) =>
		new Promise<StoredFile>((resolve, reject) => {
			const started = Date.now()
			const attempt = (attempts.get(file.name) ?? 0) + 1
			attempts.set(file.name, attempt)

			const timer = setInterval(() => {
				const percent = Math.min(
					99,
					Math.round(((Date.now() - started) / duration) * 100)
				)
				onProgress(percent)

				if (Date.now() - started >= duration) {
					clearInterval(timer)
					if (failWith) {
						reject(new Error(failWith))
						return
					}
					if (attempt <= failTimes) {
						reject(
							new Error(`La red falló (intento ${attempt} de la simulación)`)
						)
						return
					}
					const written = bucket?.store.put(
						bucket.scopes.get(scope),
						scope,
						entityId,
						file
					)
					resolve({
						key: written?.key ?? `${scope}/${entityId}/${file.name}`,
						...(written ? { replaced: written.replaced } : {}),
						url: URL.createObjectURL(file),
						scope,
						entityId,
						fileName: file.name,
						mimeType: file.type,
						size: file.size,
						uploadedAt: Date.now(),
					})
				}
			}, 120)

			signal.addEventListener('abort', () => {
				clearInterval(timer)
				const error = new Error('Carga cancelada')
				error.name = 'AbortError'
				reject(error)
			})
		})
}
