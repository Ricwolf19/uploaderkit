import { type FormEvent, useRef, useState } from 'react'
import type { SlotDefinition, SlottedFile } from 'uploaderkit/react'
import { SlottedUploader, type UploaderControllerRef } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1200 })

const slots: SlotDefinition[] = [
	{ id: 'logo', label: 'Logo principal', extensions: ['png', 'jpg'] },
	{
		id: 'isotype',
		label: 'Isotipo vectorial',
		extensions: ['svg'],
		hint: 'Solo .svg — se usa en los PDF generados',
	},
]

/**
 * `uploadOn: 'submit'` — a pick does NOT travel. It rests on its row with a
 * thumbnail, its storage name and *listo para subir*, and can be replaced or
 * removed, until the form flushes the batch through `controllerRef`.
 *
 * That resting state is the whole point of this demo: writing to a stable key
 * on selection would already have changed what the entity serves, so "cancelar"
 * would not mean cancel.
 */
export const SlottedSubmitExample = () => {
	const [files, setFiles] = useState<SlottedFile[]>([])
	const [hasStaged, setHasStaged] = useState(false)
	const [savedAt, setSavedAt] = useState<string | null>(null)
	const uploadRef = useRef<UploaderControllerRef<void>['current']>(null)

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault()
		if (!uploadRef.current?.hasPending) return
		await uploadRef.current.upload()
		setHasStaged(false)
		setSavedAt(new Date().toLocaleTimeString())
	}

	return (
		<DemoSplit
			main={
				<>
					<DemoCard>
						<form onSubmit={onSubmit} className='space-y-4'>
							<SlottedUploader
								scopes={demoScopes}
								scope='demo-identity'
								entityId='slotted-submit'
								strategy={strategy}
								uploadOn='submit'
								controllerRef={uploadRef}
								onPendingChange={setHasStaged}
								slots={slots}
								value={files}
								onChange={setFiles}
								title='Identidad de la empresa'
								description='Elige los archivos; nada se sube hasta que guardes.'
								confirmRemove
							/>
							<button
								type='submit'
								disabled={!hasStaged}
								className='bg-ui-primary text-ui-primary-fg rounded-ui cursor-pointer px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
							>
								Guardar cambios
							</button>
						</form>
					</DemoCard>
					<Hint>
						<strong>Elige un archivo y no guardes todavía:</strong> la fila
						muestra la miniatura, el nombre y &ldquo;Listo para subir&rdquo;, y
						ofrece Reemplazar y Quitar. Nada salió aún.
					</Hint>
				</>
			}
			aside={
				files.length > 0 || savedAt ? (
					<ResultPanel
						label='SlottedFile[]'
						data={{
							savedAt,
							files: files.map(f => ({ slot: f.slot, key: f.stored.key })),
						}}
					/>
				) : undefined
			}
		/>
	)
}
