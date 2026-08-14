import type { StoredFile } from 'uploaderkit'
import type { UploadStrategy } from 'uploaderkit/react'

export type FakeStrategyOptions = {
	/** Total simulated duration, ms. @defaultValue 1600 */
	duration?: number
	/** Reject every upload with this message, to demo the error path. */
	failWith?: string
	/** Fail the first N attempts per file, then succeed — the retry demo. */
	failTimes?: number
}

/**
 * Simulated transport so every demo runs without a server: ticks progress,
 * honors abort, and answers a StoredFile like the real router would.
 */
export const createFakeStrategy = ({
	duration = 1600,
	failWith,
	failTimes = 0,
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
					resolve({
						key: `${scope}/${entityId}/${file.name}`,
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
