import { useState } from 'react'
import type { StoredFile } from 'uploaderkit'
import { Uploader } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy()

/** One zone, one file. The default everything: validate → upload → done. */
export const BasicExample = () => {
	const [saved, setSaved] = useState<StoredFile[]>([])

	return (
		<DemoSplit
			main={
				<>
					<DemoCard>
						<Uploader
							scopes={demoScopes}
							scope='demo-document'
							entityId='basic'
							strategy={strategy}
							label='Documento'
							shortcut='mod+u'
							onUploaded={stored =>
								setSaved(previous => [...previous, ...stored])
							}
						/>
					</DemoCard>
					<Hint>
						La zona registra el atajo <strong>⌘U / Ctrl+U</strong> — pruébalo:
						abre el picker sin tocar el mouse. El hint <kbd>⌘U</kbd> dentro de
						la zona viene del package (prop <code>shortcut</code>).
					</Hint>
				</>
			}
			aside={
				saved.length > 0 ? (
					<ResultPanel label='StoredFile' data={saved.at(-1)} />
				) : undefined
			}
		/>
	)
}
