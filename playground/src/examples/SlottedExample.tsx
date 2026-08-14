import { useState } from 'react'
import type { SlotDefinition, SlottedFile } from 'uploaderkit/react'
import { SlottedUploader } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy()

const slots: SlotDefinition[] = [
	{ id: 'letterhead', label: 'Hoja membretada', extensions: ['pdf'] },
	{ id: 'logo', label: 'Logo principal', extensions: ['png', 'jpg'] },
	{
		id: 'isotype',
		label: 'Isotipo vectorial',
		extensions: ['svg'],
		hint: 'Solo .svg — se usa en los PDF generados',
	},
]

/**
 * Named slots, one file each. Drop a mixed batch on the bulk zone and watch
 * the extension matcher route every file to its document; each row can also
 * browse, replace, abort, remove — and take a direct drop to replace.
 */
export const SlottedExample = () => {
	const [files, setFiles] = useState<SlottedFile[]>([])

	return (
		<DemoSplit
			main={
				<>
					<DemoCard>
						<SlottedUploader
							scopes={demoScopes}
							scope='demo-identity'
							entityId='slotted'
							strategy={strategy}
							slots={slots}
							value={files}
							onChange={setFiles}
							title='Identidad de la empresa'
							description='Cada documento tiene su lugar; quitar y reemplazar piden confirmación.'
							confirmRemove
							confirmReplace
						/>
					</DemoCard>
					<Hint>
						<strong>Reemplazo rápido:</strong> arrastra un archivo directo sobre
						una fila llena — se ilumina con &ldquo;Suelta para reemplazar&rdquo;
						y pasa por el mismo diálogo de confirmación.
					</Hint>
				</>
			}
			aside={
				files.length > 0 ? (
					<ResultPanel
						label='SlottedFile[]'
						data={files.map(f => ({ slot: f.slot, key: f.stored.key }))}
					/>
				) : undefined
			}
		/>
	)
}
