export const getBackendBaseUrl = (): string => {
  const normalizeBase = (value: string): string => {
    const raw = value.trim();
    if (!raw) return 'http://127.0.0.1:8080';

    if (raw.includes('/api/graphql')) {
      return raw.split('/api/graphql')[0].replace(/\/$/, '');
    }

    if (/\/graphql\/?$/i.test(raw)) {
      return raw.replace(/\/graphql\/?$/i, '');
    }

    return raw.replace(/\/$/, '');
  };

  if (process.env.BACKEND_BASE_URL) {
    return normalizeBase(process.env.BACKEND_BASE_URL);
  }

  if (process.env.BACKEND_GRAPHQL_URL) {
    return normalizeBase(process.env.BACKEND_GRAPHQL_URL);
  }

  if (process.env.NEXT_PUBLIC_GRAPHQL_URL) {
    return normalizeBase(process.env.NEXT_PUBLIC_GRAPHQL_URL);
  }

  return 'http://127.0.0.1:8080';
};

