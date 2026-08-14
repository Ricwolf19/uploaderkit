import type { CSSProperties } from 'react'
import { EN_LABELS } from 'uploaderkit'
import { Uploader } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1200 })

/** Re-brand by CSS variables — scoped to any container. */
const violet = {
	'--color-ui-primary': '#7c3aed',
	'--color-ui-primary-hover': '#6d28d9',
	'--color-ui-primary-soft': '#f5f3ff',
	'--color-ui-primary-soft-fg': '#6d28d9',
	'--color-ui-ring': '#c4b5fd',
	'--radius-ui': '0.75rem',
	'--radius-ui-lg': '1rem',
} as CSSProperties

const CameraIcon = () => (
	<svg
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.75'
		strokeLinecap='round'
		strokeLinejoin='round'
		className='h-7 w-7'
		aria-hidden
	>
		<path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z' />
		<circle cx='12' cy='13' r='3' />
	</svg>
)

/**
 * Everything the presentation layer lets you swap without forking: labels
 * (EN_LABELS or per-string), size, the dropzone icon, and the whole color /
 * radius theme via CSS variables scoped to any container.
 */
export const CustomizationExample = () => (
	<div className='mx-auto w-full max-w-lg space-y-5'>
		<DemoCard title='size=sm · labels EN · icon propio'>
			<Uploader
				scopes={demoScopes}
				scope='demo-image'
				entityId='custom-sm'
				strategy={strategy}
				multiple
				size='sm'
				labels={EN_LABELS}
				icon={<CameraIcon />}
				capture='environment'
				description='Compact rows, English copy, camera on mobile'
			/>
		</DemoCard>

		<DemoCard title='Re-brand por CSS variables — violeta, más radio'>
			<div style={violet}>
				<Uploader
					scopes={demoScopes}
					scope='demo-image'
					entityId='custom-brand'
					strategy={strategy}
					multiple
					label='Mismo componente, otra marca'
					labels={{ dropPrompt: 'Suelta aquí las fotos del producto' }}
				/>
			</div>
			<p className='mt-2 text-xs text-slate-400'>
				El wrapper solo declara <code>--color-ui-primary</code> y compañía; el
				componente no recibe ninguna prop de color.
			</p>
		</DemoCard>

		<DemoCard title='Sin icono — layout mínimo'>
			<Uploader
				scopes={demoScopes}
				scope='demo-document'
				entityId='custom-noicon'
				strategy={strategy}
				icon={null}
				description='icon={null} quita el glifo para un layout mínimo'
			/>
		</DemoCard>
	</div>
)
