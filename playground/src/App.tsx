import { useState } from 'react'

import { DEFAULT_DEMO_ID, DEMO_GROUPS, DEMOS } from './shell/registry'

const DEMO_PARAM = 'demo'

const demoFromUrl = () => {
	const id = new URLSearchParams(window.location.search).get(DEMO_PARAM)
	return DEMOS.some(demo => demo.id === id) ? id! : DEFAULT_DEMO_ID
}

/**
 * Responsive glass shell: a blurred sidebar on desktop, a sticky top bar with
 * a native `<select>` on phones — where a fixed 16rem column would eat the
 * viewport and hide the demo entirely.
 */
export const App = () => {
	const [demoId, setDemoId] = useState(demoFromUrl)
	const demo = DEMOS.find(d => d.id === demoId) ?? DEMOS[0]!
	const group = DEMO_GROUPS.find(g => g.demos.some(d => d.id === demo.id))
	const Demo = demo.render

	const select = (id: string) => {
		window.history.replaceState(null, '', `?${DEMO_PARAM}=${id}`)
		setDemoId(id)
	}

	return (
		<div className='relative flex min-h-screen flex-col overflow-x-clip bg-gradient-to-br from-slate-50 via-white to-blue-50/60 text-slate-900 lg:flex-row'>
			{/* Decorative glow — pure chrome, behind everything. */}
			<div
				aria-hidden
				className='pointer-events-none absolute top-[-8rem] right-[-8rem] h-96 w-96 rounded-full bg-blue-400/15 blur-3xl'
			/>
			<div
				aria-hidden
				className='pointer-events-none absolute bottom-[-6rem] left-[20%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl'
			/>

			{/* Mobile: sticky glass top bar with the demo picker. */}
			<header className='sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-md lg:hidden'>
				<h1 className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-base font-bold whitespace-nowrap text-transparent'>
					uploaderkit
				</h1>
				<select
					value={demoId}
					onChange={event => select(event.target.value)}
					aria-label='Demo'
					className='min-w-0 flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none'
				>
					{DEMO_GROUPS.map(g => (
						<optgroup key={g.title} label={g.title}>
							{g.demos.map(item => (
								<option key={item.id} value={item.id}>
									{item.label}
								</option>
							))}
						</optgroup>
					))}
				</select>
			</header>

			{/* Desktop: glass sidebar. */}
			<aside className='relative hidden w-64 shrink-0 border-r border-slate-200/60 bg-white/70 p-4 backdrop-blur-md lg:block'>
				<h1 className='mb-1 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold text-transparent'>
					uploaderkit
				</h1>
				<p className='mb-6 text-xs text-slate-400'>
					playground · un contrato, muchas presentaciones
				</p>

				{DEMO_GROUPS.map(g => (
					<div key={g.title} className='mb-5'>
						<p className='mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase'>
							{g.title}
						</p>
						<ul className='space-y-1'>
							{g.demos.map(item => (
								<li key={item.id}>
									<button
										type='button'
										onClick={() => select(item.id)}
										className={
											item.id === demoId
												? 'w-full cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-left text-sm font-medium text-white shadow-md shadow-blue-600/25 transition-all duration-200'
												: 'w-full cursor-pointer rounded-xl px-3 py-1.5 text-left text-sm text-slate-600 transition-all duration-200 hover:translate-x-0.5 hover:bg-blue-50/80 hover:text-blue-700'
										}
									>
										{item.label}
									</button>
								</li>
							))}
						</ul>
					</div>
				))}
			</aside>

			<main className='relative min-w-0 flex-1 p-4 sm:p-6 lg:p-8'>
				<div className='mb-4 lg:mb-6'>
					{group && (
						<span className='mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/70 px-3 py-0.5 text-[11px] font-semibold tracking-wide text-blue-700 uppercase backdrop-blur-sm'>
							{group.title}
						</span>
					)}
					<h2 className='text-lg font-semibold sm:text-xl'>{demo.label}</h2>
					<p className='text-sm text-slate-500'>{demo.blurb}</p>
				</div>
				<div className='animate-ui-fade-in' key={demo.id}>
					<Demo />
				</div>
			</main>
		</div>
	)
}
