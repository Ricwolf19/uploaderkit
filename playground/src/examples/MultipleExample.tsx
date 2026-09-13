import { useState } from 'react'
import type { StoredFile } from 'uploaderkit'
import { Uploader } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 2600 })

/**
 * One zone, many files: batch progress, per-file abort, maxFiles cap and the
 * persisted list living outside the uploader.
 */
export const MultipleExample = () => {
	const [saved, setSaved] = useState<StoredFile[]>([])

	return (
		<DemoSplit
			main={
				<>
					<DemoCard>
						<Uploader
							scopes={demoScopes}
							scope='demo-image'
							entityId='multi'
							strategy={strategy}
							multiple
							maxFiles={4}
							label='Imágenes (máximo 4)'
							stored={saved}
							onRemoveStored={file =>
								setSaved(previous =>
									previous.filter(item => item.key !== file.key)
								)
							}
							onUploaded={stored =>
								setSaved(previous => [...previous, ...stored])
							}
						/>
					</DemoCard>
					<p className='text-center text-xs text-slate-400'>
						Sube varias a la vez y cancela una en pleno vuelo — la carga vuelve
						a idle, no a error.
					</p>
				</>
			}
			aside={
				saved.length > 0 ? (
					<ResultPanel
						label={`StoredFile[] · ${saved.length}`}
						data={saved.map(item => item.key)}
					/>
				) : undefined
			}
		/>
	)
}
