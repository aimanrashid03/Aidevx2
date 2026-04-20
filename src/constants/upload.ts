export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_FILES_PER_PROJECT: 20,
  ALLOWED_EXTENSIONS: ['txt', 'md', 'csv', 'docx', 'pdf'] as const,
  ALLOWED_MIME_TYPES: [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
  ] as const,
} as const;

export const ALLOWED_EXTENSIONS_DISPLAY = 'PDF, DOCX, TXT, MD, CSV';
