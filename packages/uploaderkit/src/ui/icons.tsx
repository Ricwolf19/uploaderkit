/**
 * The package's only built-in glyph — the default icon of the dropzones.
 * Consumers replace it per uploader via the `icon` prop (any ReactNode);
 * this stays internal so the package never grows an icon library.
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
