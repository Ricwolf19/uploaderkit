/**
 * The built-in glyphs, kept to the few the package's own chrome needs — the
 * dropzone default and the viewer's header actions, which have no text on a
 * touch screen. Consumers replace the dropzone one per uploader via the `icon`
 * prop (any ReactNode); none of these is exported, so the package never grows
 * into an icon library.
 */
export const UploadCloudIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.75'
		strokeLinecap='round'
		strokeLinejoin='round'
		className={className}
		aria-hidden
	>
		<path d='M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2' />
		<path d='M12 12v9' />
		<path d='m8 16 4-4 4 4' />
	</svg>
)

/** Viewer header: save the file being previewed. */
export const DownloadIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.75'
		strokeLinecap='round'
		strokeLinejoin='round'
		className={className}
		aria-hidden
	>
		<path d='M12 3v12' />
		<path d='m7 11 5 5 5-5' />
		<path d='M4 20h16' />
	</svg>
)

/** Viewer header: open the file in its own tab. */
export const ExternalLinkIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.75'
		strokeLinecap='round'
		strokeLinejoin='round'
		className={className}
		aria-hidden
	>
		<path d='M14 4h6v6' />
		<path d='M20 4 10 14' />
		<path d='M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' />
	</svg>
)

/** Viewer: the preview could not be rendered. */
export const FileWarningIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.5'
		strokeLinecap='round'
		strokeLinejoin='round'
		className={className}
		aria-hidden
	>
		<path d='M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' />
		<path d='M14 3v5h5' />
		<path d='M12 11v4' />
		<path d='M12 18h.01' />
	</svg>
)
