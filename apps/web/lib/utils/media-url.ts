const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const API_V_PREFIX_PATTERN = /^\/api\/v\d+\//i;
const UPLOADS_SEGMENT_PATTERN = /\/uploads\//i;
const WINDOWS_SEPARATOR_PATTERN = /\\/g;
const MULTIPLE_SLASH_PATTERN = /\/{2,}/g;

const sanitizePathInput = (value: string): string =>
  value
    .replace(WINDOWS_SEPARATOR_PATTERN, '/')
    .replace(MULTIPLE_SLASH_PATTERN, '/');

const normalizePath = (path: string): string => {
  const sanitizedPath = sanitizePathInput(path).trim();
  const withLeadingSlash = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
  return withLeadingSlash.replace(API_V_PREFIX_PATTERN, '/');
};

export const resolveMediaUrl = (value: string | null | undefined): string => {
  if (!value) return '';
  const raw = sanitizePathInput(value).trim();
  if (!raw) return '';

  if (raw.startsWith('data:image/') || raw.startsWith('blob:')) {
    return raw;
  }

  if (ABSOLUTE_URL_PATTERN.test(raw)) {
    try {
      const parsed = new URL(raw);
      parsed.pathname = normalizePath(parsed.pathname);
      return parsed.toString();
    } catch {
      return raw;
    }
  }

  const normalizedPath = normalizePath(raw);

  if (UPLOADS_SEGMENT_PATTERN.test(normalizedPath)) {
    const uploadsStartIndex = normalizedPath.toLowerCase().indexOf('/uploads/');
    return normalizedPath.slice(uploadsStartIndex);
  }

  return normalizedPath;
};
