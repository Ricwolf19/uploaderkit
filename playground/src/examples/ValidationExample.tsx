import { useState } from 'react'
import { Uploader } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy()
const failing = createFakeStrategy({
	duration: 900,
	failWith: 'El servidor rechazó el archivo (demo del camino de error)',
})

/**
 * The rejection paths: wrong extension, oversized file, spoofed magic number
 * — all caught before a byte leaves — plus a server that answers an error.
 */
export const ValidationExample = () => {
	const [serverFails, setServerFails] = useState(false)
	const [rejections, setRejections] = useState<string[]>([])

	return (
		<DemoSplit
			main={
				<>
					<Hint tone='warn'>
						Este scope solo acepta <strong>.pdf hasta 1 MB</strong> y verifica
						el encabezado binario: renombra un .png a .pdf e inténtalo — la
						validación lo detecta sin subirlo.
					</Hint>

					<label className='flex cursor-pointer items-center gap-2 text-sm text-slate-600'>
						<input
							type='checkbox'
							checked={serverFails}
							onChange={event => setServerFails(event.target.checked)}
							className='cursor-pointer'
						/>
						Simular rechazo del servidor
					</label>

					<DemoCard>
						<Uploader
							scopes={demoScopes}
							scope='demo-strict-pdf'
							entityId='validation'
							strategy={serverFails ? failing : strategy}
							label='PDF estricto'
							description='.pdf · máximo 1 MB · magic number verificado'
							onError={message =>
								setRejections(previous => [...previous, message])
							}
						/>
					</DemoCard>
				</>
			}
			aside={
				rejections.length > 0 ? (
					<ResultPanel label='onError · rechazos' data={rejections} />
				) : undefined
			}
		/>
	)
}
