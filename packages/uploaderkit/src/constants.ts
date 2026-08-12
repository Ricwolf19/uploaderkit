import type { FileCategory, FileCategoryConfig, FileExtension } from './types'

export const KB = 1024
export const MB = 1024 * KB
export const GB = 1024 * MB

/**
 * Leading bytes that identify a format regardless of its extension. The check
 * that uses them is the only defence against an executable renamed to `.pdf`,
 * since both the extension and the browser-reported MIME come from the client.
 */
export const MAGIC_NUMBERS: Partial<Record<FileExtension, number[]>> = {
	png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	jpg: [0xff, 0xd8, 0xff],
	jpeg: [0xff, 0xd8, 0xff],
	gif: [0x47, 0x49, 0x46, 0x38],
	webp: [0x52, 0x49, 0x46, 0x46], // RIFF; bytes 8-11 spell WEBP
	ico: [0x00, 0x00, 0x01, 0x00],

	pdf: [0x25, 0x50, 0x44, 0x46], // %PDF

	// OOXML files are ZIP containers, so docx/xlsx share the PK signature.
	docx: [0x50, 0x4b, 0x03, 0x04],
	xlsx: [0x50, 0x4b, 0x03, 0x04],
	doc: [0xd0, 0xcf, 0x11, 0xe0],
	xls: [0xd0, 0xcf, 0x11, 0xe0],

	// DER/ASN.1 sequence header.
	cer: [0x30, 0x82],
	crt: [0x30, 0x82],
	key: [0x30, 0x82],
	pem: [0x2d, 0x2d, 0x2d, 0x2d, 0x2d], // -----

	webm: [0x1a, 0x45, 0xdf, 0xa3],
	avi: [0x52, 0x49, 0x46, 0x46],
	mp3: [0x49, 0x44, 0x33], // ID3
	wav: [0x52, 0x49, 0x46, 0x46],
	ogg: [0x4f, 0x67, 0x67, 0x53],
	aac: [0xff, 0xf1],
}

export const MIME_TYPES: Record<FileExtension, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	svg: 'image/svg+xml',
	webp: 'image/webp',
	gif: 'image/gif',
	ico: 'image/x-icon',
	heic: 'image/heic',

	cer: 'application/x-x509-ca-cert',
	crt: 'application/x-x509-ca-cert',
	pem: 'application/x-pem-file',
	key: 'application/x-pem-file',

	pdf: 'application/pdf',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	xls: 'application/vnd.ms-excel',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	csv: 'text/csv',
	txt: 'text/plain',

	xml: 'application/xml',
	json: 'application/json',

	mp4: 'video/mp4',
	mov: 'video/quicktime',
	avi: 'video/x-msvideo',
	webm: 'video/webm',

	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	ogg: 'audio/ogg',
	aac: 'audio/aac',
}

/**
 * Defaults per category. A scope always narrows these; it can never widen the
 * extension list, which is what keeps `any` from leaking into a strict scope.
 */
export const FILE_CATEGORY_CONFIG: Record<FileCategory, FileCategoryConfig> = {
	image: {
		extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'],
		maxBytes: 5 * MB,
		validateMagicNumbers: true,
		label: 'imagen',
		accept: 'image/*',
	},
	certificate: {
		extensions: ['cer', 'crt', 'pem'],
		maxBytes: 50 * KB,
		validateMagicNumbers: true,
		label: 'certificado',
		accept: '.cer,.crt,.pem',
	},
	key: {
		extensions: ['key'],
		maxBytes: 50 * KB,
		validateMagicNumbers: true,
		label: 'llave privada',
		accept: '.key',
	},
	pdf: {
		extensions: ['pdf'],
		maxBytes: 20 * MB,
		validateMagicNumbers: true,
		label: 'PDF',
		accept: '.pdf',
	},
	document: {
		extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'],
		maxBytes: 20 * MB,
		validateMagicNumbers: false,
		label: 'documento',
		accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
	},
	data: {
		extensions: ['xml', 'json'],
		maxBytes: 5 * MB,
		validateMagicNumbers: false,
		label: 'archivo de datos',
		accept: '.xml,.json',
	},
	video: {
		extensions: ['mp4', 'mov', 'avi', 'webm'],
		maxBytes: 100 * MB,
		validateMagicNumbers: false,
		label: 'video',
		accept: 'video/*',
	},
	audio: {
		extensions: ['mp3', 'wav', 'ogg', 'aac'],
		maxBytes: 20 * MB,
		validateMagicNumbers: false,
		label: 'audio',
		accept: 'audio/*',
	},
	any: {
		extensions: [],
		maxBytes: 20 * MB,
		validateMagicNumbers: false,
		label: 'archivo',
		accept: '*/*',
	},
}
