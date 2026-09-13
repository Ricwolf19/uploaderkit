import type { ReactNode } from 'react'

/**
 * The playground's shared chrome: a glass card per demo, a terminal-styled
 * result panel and an info hint — so every example reads as one system.
 */

export const DemoCard = ({
	title,
	children,
}: {
	title?: string
	children: ReactNode
}) => (
	<section className='rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] backdrop-blur-md sm:p-6'>
		{title && (
			<h3 className='mb-4 text-sm font-semibold text-slate-700'>{title}</h3>
		)}
		{/* Spacing lives here so every demo breathes the same. */}
		<div className='space-y-4'>{children}</div>
	</section>
)

/**
 * Centered demo layout: single column on phones, demo + live result side by
 * side on wide screens — the result panel stops pushing everything down.
 */
export const DemoSplit = ({
	main,
	aside,
	children,
}: {
	main: ReactNode
	aside?: ReactNode
	/** Overlays and portals that live outside the grid. */
	children?: ReactNode
}) => (
	<>
		<div
			className={
				aside
					? 'mx-auto grid w-full max-w-lg items-start gap-4 lg:max-w-5xl lg:grid-cols-2 lg:gap-6'
					: 'mx-auto w-full max-w-lg'
			}
		>
			<div className='min-w-0 space-y-4'>{main}</div>
			{aside && (
				<div className='min-w-0 space-y-4 lg:sticky lg:top-6'>{aside}</div>
			)}
		</div>
		{children}
	</>
)

/** Mac-terminal styled JSON output, the "what the server saw" panel. */
export const ResultPanel = ({
	label = 'resultado',
	data,
}: {
	label?: string
	data: unknown
}) => (
	<div className='animate-ui-fade-in overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg'>
		<div className='flex items-center gap-1.5 border-b border-slate-800 bg-slate-950/60 px-3 py-2'>
			<span className='h-2.5 w-2.5 rounded-full bg-red-400/80' />
			<span className='h-2.5 w-2.5 rounded-full bg-amber-400/80' />
			<span className='h-2.5 w-2.5 rounded-full bg-green-400/80' />
			<span className='ml-2 text-[11px] tracking-wide text-slate-500'>
				{label}
			</span>
		</div>
		<pre className='overflow-auto p-3 text-xs leading-relaxed text-emerald-300'>
			{JSON.stringify(data, null, 2)}
		</pre>
	</div>
)

export const Hint = ({
	tone = 'info',
	children,
}: {
	tone?: 'info' | 'warn'
	children: ReactNode
}) => (
	<div
		className={
			tone === 'warn'
				? 'rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-800 backdrop-blur-sm'
				: 'rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-blue-800 backdrop-blur-sm'
		}
	>
		{children}
	</div>
)
