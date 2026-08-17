import type { ComponentType } from 'react'

import { AvatarExample } from '../examples/AvatarExample'
import { BasicExample } from '../examples/BasicExample'
import { CompressionExample } from '../examples/CompressionExample'
import { CustomizationExample } from '../examples/CustomizationExample'
import { DropAnywhereExample } from '../examples/DropAnywhereExample'
import { FormExample } from '../examples/FormExample'
import { GalleryExample } from '../examples/GalleryExample'
import { HeadlessExample } from '../examples/HeadlessExample'
import { MultipleExample } from '../examples/MultipleExample'
import { ResolverExample } from '../examples/ResolverExample'
import { RetryExample } from '../examples/RetryExample'
import { SlottedExample } from '../examples/SlottedExample'
import { ValidationExample } from '../examples/ValidationExample'

export type Demo = {
	id: string
	/** Sidebar entry. */
	label: string
	/** One line under the label — why you'd open this one. */
	blurb: string
	render: ComponentType
}

export type DemoGroup = {
	title: string
	demos: Demo[]
}

/**
 * Every demo, grouped by the question it answers — same shape as the listkit
 * playground. Order matters: a reviewer reads top to bottom, from "does it
 * work at all" to the narrow surfaces.
 */
export const DEMO_GROUPS: DemoGroup[] = [
	{
		title: 'Uploader',
		demos: [
			{
				id: 'basic',
				label: 'Básico',
				blurb: 'Una zona, un archivo — validar, subir, listo.',
				render: BasicExample,
			},
			{
				id: 'multiple',
				label: 'Múltiple',
				blurb: 'Varios archivos, tope de maxFiles, abort por archivo.',
				render: MultipleExample,
			},
			{
				id: 'form',
				label: 'Trigger manual',
				blurb: 'uploadOn manual — el archivo viaja con el submit del form.',
				render: FormExample,
			},
			{
				id: 'custom',
				label: 'Personalización',
				blurb: 'size, icon, labels EN y re-brand por CSS variables.',
				render: CustomizationExample,
			},
		],
	},
	{
		title: 'Slotted',
		demos: [
			{
				id: 'slotted',
				label: 'Slots con nombre',
				blurb: 'Un documento por posición; el drop masivo rutea solo.',
				render: SlottedExample,
			},
		],
	},
	{
		title: 'Pipeline',
		demos: [
			{
				id: 'validation',
				label: 'Validación',
				blurb: 'Extensión, tamaño y magic number antes de subir un byte.',
				render: ValidationExample,
			},
			{
				id: 'compression',
				label: 'Compresión',
				blurb: 'Downscale + strip de EXIF vía el compress del scope.',
				render: CompressionExample,
			},
			{
				id: 'retry',
				label: 'Reintentos',
				blurb: 'retry con backoff + concurrency sobre una red inestable.',
				render: RetryExample,
			},
		],
	},
	{
		title: 'Recetas',
		demos: [
			{
				id: 'avatar',
				label: 'Avatar',
				blurb: 'Foto de perfil circular con anillo de progreso — hook puro.',
				render: AvatarExample,
			},
			{
				id: 'gallery',
				label: 'Galería',
				blurb: 'Grid de miniaturas, visor con flechas y acciones al hover.',
				render: GalleryExample,
			},
			{
				id: 'drop-anywhere',
				label: 'Drop anywhere',
				blurb: 'Toda la página es el target — overlay al entrar el drag.',
				render: DropAnywhereExample,
			},
		],
	},
	{
		title: 'Headless',
		demos: [
			{
				id: 'headless',
				label: 'UI propia',
				blurb: 'El hook sin /ui — design system del consumidor.',
				render: HeadlessExample,
			},
			{
				id: 'resolvers',
				label: 'Resolvers de lectura',
				blurb: 'Object URL vs bytes, y qué url lleva los headers.',
				render: ResolverExample,
			},
		],
	},
]

export const DEMOS: Demo[] = DEMO_GROUPS.flatMap(group => group.demos)
export const DEFAULT_DEMO_ID = DEMOS[0]!.id
