import { UPLOAD_LIMITS, ALLOWED_EXTENSIONS_DISPLAY } from '../constants/upload';

export function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!(UPLOAD_LIMITS.ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `"${file.name}" — unsupported format. Allowed: ${ALLOWED_EXTENSIONS_DISPLAY}`,
    };
  }

  if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is ${sizeMb} MB — maximum file size is ${UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB`,
    };
  }

  return { valid: true };
}

export function validateFileCount(
  currentCount: number,
  newFilesCount: number,
): { valid: boolean; error?: string } {
  if (currentCount + newFilesCount > UPLOAD_LIMITS.MAX_FILES_PER_PROJECT) {
    const remaining = UPLOAD_LIMITS.MAX_FILES_PER_PROJECT - currentCount;
    if (remaining <= 0) {
      return {
        valid: false,
        error: `Project has reached the limit of ${UPLOAD_LIMITS.MAX_FILES_PER_PROJECT} files. Delete existing files to upload more.`,
      };
    }
    return {
      valid: false,
      error: `Only ${remaining} more file${remaining === 1 ? '' : 's'} can be added (limit: ${UPLOAD_LIMITS.MAX_FILES_PER_PROJECT} per project).`,
    };
  }
  return { valid: true };
}
