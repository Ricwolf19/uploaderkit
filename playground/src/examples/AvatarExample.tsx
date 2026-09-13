import { useState } from 'react'
import { AvatarUploader } from 'uploaderkit/presets'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 2200 })

/**
 * The avatar recipe as one component: the picture is the control, a drop
 * lands on it directly, the ring closes while it uploads, and the caller only
 * decides what to do with the returned `StoredFile`.
 */
export const AvatarExample = () => {
	const [savedUrl, setSavedUrl] = useState<string | null>(null)
	const [savedKey, setSavedKey] = useState<string | null>(null)

	return (
		<DemoSplit
			main={
				<>
					<DemoCard title='Foto de perfil'>
						<div className='flex items-center gap-5'>
							<AvatarUploader
								scopes={demoScopes}
								scope='demo-avatar'
								entityId='user-42'
								strategy={strategy}
								src={savedUrl}
								fallback='RT'
								size={96}
								onUploaded={stored => {
									setSavedUrl(stored.url)
									setSavedKey(stored.key)
								}}
								onRemove={() => {
									setSavedUrl(null)
									setSavedKey(null)
								}}
							/>
							<div className='min-w-0'>
								<p className='text-sm font-medium text-slate-800'>
									Ricardo Tapia
								</p>
								<p className='text-xs text-slate-500'>
									Toca la foto o <strong>suelta una imagen encima</strong> · se
									comprime a 512px y reemplaza la anterior
								</p>
							</div>
						</div>
					</DemoCard>

					<Hint>
						<code>AvatarUploader</code> sube al seleccionar — un anillo de
						progreso sin nada viajando detrás sería teatro. El campo del
						formulario sigue moviéndose sólo cuando la app guarda el{' '}
						<code>StoredFile</code> que recibe en <code>onUploaded</code>.
					</Hint>
				</>
			}
			aside={
				savedKey ? (
					<ResultPanel label='StoredFile.key' data={savedKey} />
				) : undefined
			}
		/>
	)
}
