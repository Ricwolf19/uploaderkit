import { MAGIC_NUMBERS } from './constants'
import { formatFileSize, getFileExtension, isKnownExtension } from './file'
import { resolveLabels, type UploaderLabels } from './labels'
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
	allowed: FileExtension[],
	labels?: Partial<UploaderLabels>
): ValidationResult => {
	if (allowed.length === 0) return ok

	const copy = resolveLabels(labels)
	const extension = getFileExtension(fileName)
	if (!extension) {
		return fail('extension-not-allowed', copy.fileHasNoExtension)
	}
	if (!allowed.includes(extension as FileExtension)) {
		return fail('extension-not-allowed', copy.formatNotAllowed(allowed))
	}
	return ok
}

export const validateSize = (
	size: number,
	maxBytes: number,
	labels?: Partial<UploaderLabels>
): ValidationResult => {
	const copy = resolveLabels(labels)
	if (size === 0) return fail('empty-file', copy.fileIsEmpty)
	if (size > maxBytes) {
		return fail(
			'too-large',
			copy.fileTooLarge(formatFileSize(size), formatFileSize(maxBytes))
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
	file: FileLike,
	labels?: Partial<UploaderLabels>
): Promise<ValidationResult> => {
	const copy = resolveLabels(labels)
	const extension = getFileExtension(file.name)
	if (!isKnownExtension(extension)) return ok

	const expected = MAGIC_NUMBERS[extension]
	if (!expected) return ok

	const head = new Uint8Array(await file.arrayBuffer()).slice(
		0,
		expected.length
	)
	if (head.length < expected.length) {
		return fail('magic-number-mismatch', copy.fileIncomplete)
	}

	const matches = expected.every((byte, index) => head[index] === byte)
	return matches
		? ok
		: fail('magic-number-mismatch', copy.contentDoesNotMatchExtension)
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
		labels,
		customValidation,
	} = options

	const size = validateSize(file.size, maxBytes, labels)
	if (!size.valid) return size

	const extension = validateExtension(file.name, allowedExtensions, labels)
	if (!extension.valid) return extension

	if (checkMagic) {
		const magic = await validateMagicNumbers(file, labels)
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
