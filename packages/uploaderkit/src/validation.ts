import { MAGIC_NUMBERS } from './constants'
import { formatFileSize, getFileExtension, isKnownExtension } from './file'
import type {
	FileExtension,
	FileLike,
	ValidationOptions,
	ValidationResult,
} from './types'

const ok: ValidationResult = { valid: true }

const fail = (
	code: Exclude<ValidationResult, { valid: true }>['code'],
	message: string
): ValidationResult => ({ valid: false, code, message })

export const validateExtension = (
	fileName: string,
	allowed: FileExtension[]
): ValidationResult => {
	if (allowed.length === 0) return ok

	const extension = getFileExtension(fileName)
	if (!extension) {
		return fail('extension-not-allowed', 'El archivo no tiene extensión')
	}
	if (!allowed.includes(extension as FileExtension)) {
		return fail(
			'extension-not-allowed',
			`Formato no permitido. Se aceptan: ${allowed.join(', ')}`
		)
	}
	return ok
}

export const validateSize = (
	size: number,
	maxBytes: number
): ValidationResult => {
	if (size === 0) return fail('empty-file', 'El archivo está vacío')
	if (size > maxBytes) {
		return fail(
			'too-large',
			`El archivo pesa ${formatFileSize(size)} y el máximo es ${formatFileSize(maxBytes)}`
		)
	}
	return ok
}

/**
 * Compares the file's leading bytes against the signature its extension
 * claims. Extensions without a known signature pass — absence of a signature
 * is not evidence of tampering.
 */
export const validateMagicNumbers = async (
	file: FileLike
): Promise<ValidationResult> => {
	const extension = getFileExtension(file.name)
	if (!isKnownExtension(extension)) return ok

	const expected = MAGIC_NUMBERS[extension]
	if (!expected) return ok

	const head = new Uint8Array(await file.arrayBuffer()).slice(
		0,
		expected.length
	)
	if (head.length < expected.length) {
		return fail('magic-number-mismatch', 'El archivo está incompleto')
	}

	const matches = expected.every((byte, index) => head[index] === byte)
	return matches
		? ok
		: fail(
				'magic-number-mismatch',
				'El contenido del archivo no corresponde a su extensión'
			)
}

/**
 * Runs the checks cheapest-first so a 2 GB file is rejected on its size before
 * anything reads its bytes.
 */
export const validateFile = async (
	file: FileLike,
	options: ValidationOptions = {}
): Promise<ValidationResult> => {
	const {
		maxBytes = Infinity,
		allowedExtensions = [],
		validateMagicNumbers: checkMagic = false,
		customValidation,
	} = options

	const size = validateSize(file.size, maxBytes)
	if (!size.valid) return size

	const extension = validateExtension(file.name, allowedExtensions)
	if (!extension.valid) return extension

	if (checkMagic) {
		const magic = await validateMagicNumbers(file)
		if (!magic.valid) return magic
	}

	if (customValidation) return customValidation(file)

	return ok
}

export type FileValidation = {
	file: FileLike
	result: ValidationResult
}

/** Validates every file and reports each result; never short-circuits. */
export const validateFiles = async (
	files: FileLike[],
	options: ValidationOptions = {}
): Promise<FileValidation[]> =>
	Promise.all(
		files.map(async file => ({
			file,
			result: await validateFile(file, options),
		}))
	)
