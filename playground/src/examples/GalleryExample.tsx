import { useState } from 'react'
import type { StoredFile } from 'uploaderkit'
import { GalleryUploader } from 'uploaderkit/presets'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1800 })

/**
 * The gallery recipe as one component: tiles from the files' own previews, a
 * progress wash while they travel, hover actions, the add tile as the
 * dropzone, and the full-screen viewer over the whole set.
 */
export const GalleryExample = () => {
	const [stored, setStored] = useState<StoredFile[]>([])

	return (
		<DemoSplit
			main={
				<>
					<DemoCard title='Galería del producto'>
						<GalleryUploader
							scopes={demoScopes}
							scope='demo-image'
							entityId='gallery'
							strategy={strategy}
							stored={stored}
							onUploaded={files => setStored(current => [...current, ...files])}
							onRemoveStored={file =>
								setStored(current =>
									current.filter(entry => entry.key !== file.key)
								)
							}
						/>
					</DemoCard>

					<Hint>
						La app sólo posee la lista <code>stored</code>: cada tile que el
						servidor confirma se le devuelve por <code>onUploaded</code> y el
						componente deja de dibujarlo como en vuelo. Abre una y navega con{' '}
						<kbd>←</kbd> <kbd>→</kbd>.
					</Hint>
				</>
			}
			aside={
				stored.length > 0 ? (
					<ResultPanel
						label={`StoredFile[] · ${stored.length}`}
						data={stored.map(item => item.key)}
					/>
				) : undefined
			}
		/>
	)
}
