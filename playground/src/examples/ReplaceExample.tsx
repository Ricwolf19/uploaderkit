import { useMemo, useState } from 'react'
import type { StoredFile } from 'uploaderkit'
import { resolveReplaceMode } from 'uploaderkit'
import { Uploader } from 'uploaderkit/ui'

import { createFakeBucket, reconcile } from '../fakeBucket'
import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, ResultPanel } from '../shell/ui'

const MODES = [
	{
		scope: 'demo-replace-single' as const,
		title: 'Un archivo',
		blurb:
			'La key lleva el nombre y el scope guarda uno solo: cada subida borra la anterior del bucket, aunque se llame distinto.',
	},
	{
		scope: 'demo-image' as const,
		title: 'Colección',
		blurb:
			'maxFiles: 12 — nombres distintos conviven; el mismo nombre sobrescribe su propia key.',
	},
	{
		scope: 'demo-replace-never' as const,
		title: 'Sin barrido',
		blurb: 'replace: false — nada se borra, el bucket conserva todo.',
	},
]

/**
 * The three replace modes against a bucket that applies the same rules the
 * server does, so what the panel lists is what GCS would hold — not what this
 * component happened to append.
 */
export const ReplaceExample = () => {
	const bucketStore = useMemo(() => createFakeBucket(), [])
	const strategy = useMemo(
		() =>
			createFakeStrategy({
				duration: 900,
				bucket: { store: bucketStore, scopes: demoScopes as never },
			}),
		[bucketStore]
	)

	const [saved, setSaved] = useState<Record<string, StoredFile[]>>({})
	const [bucketKeys, setBucketKeys] = useState<string[]>([])

	return (
		<DemoSplit
			main={
				<div className='grid gap-4 lg:grid-cols-3'>
					{MODES.map(({ scope, title, blurb }) => (
						<DemoCard key={scope}>
							<div className='mb-3'>
								<div className='flex items-center justify-between gap-2'>
									<h3 className='text-sm font-medium text-slate-200'>
										{title}
									</h3>
									<code className='rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-sky-300'>
										{String(resolveReplaceMode(demoScopes.get(scope)))}
									</code>
								</div>
								<p className='mt-1 text-xs text-slate-400'>{blurb}</p>
							</div>
							<Uploader
								scopes={demoScopes}
								scope={scope}
								entityId='demo'
								strategy={strategy}
								label='Suelta una imagen'
								stored={saved[scope] ?? []}
								onRemoveStored={file => {
									bucketStore.remove(file.key)
									setBucketKeys(bucketStore.keys())
									setSaved(previous => ({
										...previous,
										[scope]: (previous[scope] ?? []).filter(
											item => item.key !== file.key
										),
									}))
								}}
								onUploaded={stored => {
									const replaced = stored.flatMap(
										file =>
											(file as StoredFile & { replaced?: string[] }).replaced ??
											[]
									)
									setBucketKeys(bucketStore.keys())
									setSaved(previous => ({
										...previous,
										[scope]: reconcile(previous[scope] ?? [], stored, replaced),
									}))
								}}
							/>
						</DemoCard>
					))}
				</div>
			}
			aside={
				<ResultPanel
					label='Lo que hay en el bucket'
					data={{
						bucket: bucketKeys,
						persistido: Object.fromEntries(
							MODES.map(({ scope }) => [
								scope,
								(saved[scope] ?? []).map(file => file.key),
							])
						),
					}}
				/>
			}
		/>
	)
}
