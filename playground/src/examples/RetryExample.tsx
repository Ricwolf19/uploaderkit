import { useMemo, useState } from 'react'
import { Uploader } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint } from '../shell/ui'

/**
 * A flaky network: the strategy fails the first two attempts per file and
 * succeeds on the third. With `retry: { attempts: 3 }` the hook absorbs both
 * failures behind exponential backoff; without it the first failure is final.
 * `concurrency: 2` queues everything past the second file.
 */
export const RetryExample = () => {
	const [withRetry, setWithRetry] = useState(true)
	// Keyed remount below also rebuilds this, so attempt counters start clean.
	const strategy = useMemo(
		() => createFakeStrategy({ duration: 700, failTimes: 2 }),
		[]
	)

	return (
		<DemoSplit
			main={
				<>
					<Hint tone='warn'>
						Esta red simulada tira las <strong>dos primeras</strong> subidas de
						cada archivo. Con retry el error nunca llega a la fila; sin retry se
						queda.
					</Hint>

					<label className='flex cursor-pointer items-center gap-2 text-sm text-slate-600'>
						<input
							type='checkbox'
							checked={withRetry}
							onChange={event => setWithRetry(event.target.checked)}
							className='cursor-pointer'
						/>
						retry: {'{ attempts: 3, backoffMs: 400 }'}
					</label>

					<DemoCard>
						<Uploader
							key={String(withRetry)}
							scopes={demoScopes}
							scope='demo-image'
							entityId='retry'
							strategy={strategy}
							multiple
							concurrency={2}
							{...(withRetry ? { retry: { attempts: 3, backoffMs: 400 } } : {})}
							label='Imágenes sobre red inestable'
							description='Suelta varias — máximo 2 en vuelo a la vez'
						/>
					</DemoCard>
				</>
			}
		/>
	)
}
