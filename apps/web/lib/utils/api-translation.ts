import { NextRequest, NextResponse } from 'next/server';
import { getLocale } from 'next-intl/server';

/**
 * Middleware to translate API responses based on client locale
 */
export async function withApiTranslation(
  request: NextRequest,
  handler: (req: NextRequest, locale: string) => Promise<NextResponse>
) {
  // Get locale from request header, query param, or cookie
  const requestLocale = request.headers.get('accept-language')?.split(',')[0] ||
                      request.nextUrl.searchParams.get('locale') ||
                      request.cookies.get('locale')?.value ||
                      'id';

  // Use request locale if provided, otherwise use detected locale
  const locale = requestLocale || (await getLocale());

  // Handle the request with locale context
  const response = await handler(request, locale);

  // Add locale information to response headers
  response.headers.set('Content-Language', locale);
  response.headers.set('X-Server-Locale', locale);

  return response;
}

/**
 * Translate API response data based on locale
 */
export function translateApiResponse(
  data: any,
  locale: string,
  translationPath: string = 'api'
): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => translateApiResponse(item, locale, translationPath));
  }

  // Handle objects with translatable fields
  const translatedData = { ...data };

  // Common fields that should be translated
  const translatableFields = [
    'title', 'description', 'message', 'error', 'success', 'warning',
    'status', 'label', 'placeholder', 'help_text', 'validation_error',
    // Custom fields for Agrinova
    'harvest_status', 'gate_check_status', 'role_name', 'company_name',
    'estate_name', 'division_name', 'block_name', 'tph_name'
  ];

  translatableFields.forEach(field => {
    if (translatedData[field] && typeof translatedData[field] === 'string') {
      // In production, you would use actual translation files here
      // For now, we'll use a simple mapping
      translatedData[field] = translateText(translatedData[field], locale, `${translationPath}.${field}`);
    }
  });

  return translatedData;
}

/**
 * Simple text translation function (in production, use actual translation files)
 */
function translateText(text: string, locale: string, key: string): string {
  // In production, this would load from your translation files
  const translations = {
    en: {
      'api.success.created': 'Created successfully',
      'api.success.updated': 'Updated successfully',
      'api.success.deleted': 'Deleted successfully',
      'api.error.not_found': 'Not found',
      'api.error.unauthorized': 'Unauthorized access',
      'harvest_status.pending': 'Pending',
      'harvest_status.approved': 'Approved',
      'harvest_status.rejected': 'Rejected',
      'gate_check_status.active': 'Active',
      'gate_check_status.completed': 'Completed',
      'role_name.mandor': 'Mandor',
      'role_name.asisten': 'Assistant',
      'role_name.manager': 'Manager',
      'role_name.area_manager': 'Area Manager',
      'role_name.satpam': 'Security',
      'role_name.company_admin': 'Company Admin',
      'role_name.super_admin': 'Super Admin',
    },
    id: {
      'api.success.created': 'Berhasil dibuat',
      'api.success.updated': 'Berhasil diperbarui',
      'api.success.deleted': 'Berhasil dihapus',
      'api.error.not_found': 'Tidak ditemukan',
      'api.error.unauthorized': 'Akses tidak diizinkan',
      'harvest_status.pending': 'Menunggu',
      'harvest_status.approved': 'Disetujui',
      'harvest_status.rejected': 'Ditolak',
      'gate_check_status.active': 'Aktif',
      'gate_check_status.completed': 'Selesai',
      'role_name.mandor': 'Mandor',
      'role_name.asisten': 'Asisten',
      'role_name.manager': 'Manager',
      'role_name.area_manager': 'Area Manager',
      'role_name.satpam': 'Satpam',
      'role_name.company_admin': 'Company Admin',
      'role_name.super_admin': 'Super Admin',
    }
  };

  // Try to find translation for the key
  if (translations[locale]?.[key]) {
    return translations[locale][key];
  }

  // Fallback to exact text match
  if (translations[locale]?.[text]) {
    return translations[locale][text];
  }

  // Fallback to original text
  return text;
}

/**
 * API response wrapper that includes locale information
 */
export function createApiResponse(
  data: any,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    locale?: string;
  } = {}
): NextResponse {
  const { status = 200, statusText = 'OK', headers = {}, locale = 'id' } = options;

  // Translate response data if locale is provided
  const translatedData = locale ? translateApiResponse(data, locale) : data;

  // Create response with translated data
  return NextResponse.json(translatedData, {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      'Content-Language': locale,
      'X-Server-Locale': locale,
      ...headers
    }
  });
}

/**
 * Create standardized API response with success/error handling
 */
export class ApiResponse {
  static success(
    data: any,
    message?: string,
    locale: string = 'id'
  ): NextResponse {
      return createApiResponse({
        success: true,
        data,
        message: message || translateText('api.success.updated', locale, 'api.success.updated'),
        locale
      });
    }

  static error(
    error: string,
    code: string,
    locale: string = 'id'
  ): NextResponse {
      return createApiResponse({
        success: false,
        error: {
          code,
          message: translateText(error, locale, `api.error.${code}`),
          details: error
        },
        locale
      }, { status: 400 });
    }

  static notFound(message?: string, locale: string = 'id'): NextResponse {
      return createApiResponse({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: message || translateText('api.error.not_found', locale, 'api.error.not_found')
        },
        locale
      }, { status: 404 });
    }

    static unauthorized(message?: string, locale: string = 'id'): NextResponse {
      return createApiResponse({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: message || translateText('api.error.unauthorized', locale, 'api.error.unauthorized')
        },
        locale
      }, { status: 401 });
    }

    static serverError(message?: string, locale: string = 'id'): NextResponse {
      return createApiResponse({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: message || 'Internal server error'
        },
        locale
      }, { status: 500 });
    }
}