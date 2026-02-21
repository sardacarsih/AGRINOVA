import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:agrinova_mobile/core/config/app_config.dart';
import 'package:agrinova_mobile/core/services/database_service.dart';
import 'package:agrinova_mobile/core/graphql/graphql_client.dart';

/// Language synchronization service for mobile app
/// Handles language preferences and translation synchronization with web API
class LanguageSyncService {
  static const String _languageKey = 'app_language';
  static const String _lastSyncKey = 'language_last_sync';
  static const String _translationsKey = 'cached_translations';

  static LanguageSyncService? _instance;
  static LanguageSyncService get instance => _instance ??= LanguageSyncService._();
  LanguageSyncService._();

  /// Get current language preference
  Future<String> getCurrentLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_languageKey) ?? 'id'; // Default to Indonesian
  }

  /// Set language preference and sync with web
  Future<void> setLanguage(String languageCode) async {
    final prefs = await SharedPreferences.getInstance();

    // Validate language code
    if (!_isValidLanguageCode(languageCode)) {
      throw ArgumentError('Invalid language code: $languageCode');
    }

    // Save locally
    await prefs.setString(_languageKey, languageCode);

    // Sync with web API if online
    try {
      await _syncLanguageWithApi(languageCode);
    } catch (e) {
      print('Warning: Failed to sync language with API: $e');
      // Continue even if API sync fails - local preference is set
    }

    // Update cached translations if needed
    await _updateLocalTranslations(languageCode);
  }

  /// Sync language preference with backend API
  Future<void> _syncLanguageWithApi(String languageCode) async {
    try {
      final client = GraphQLClientManager.instance.getClient();

      final result = await client.mutate(
        options: MutationOptions(
          document: gql('''
            mutation UpdateUserLanguage(\$language: String!) {
              updateUserLanguage(language: \$language) {
                success
                message
                user {
                  id
                  languagePreference
                }
              }
            }
          '''),
          variables: {'language': languageCode},
        ),
      );

      if (result.hasException) {
        throw Exception('Failed to update language preference: ${result.exception}');
      }

      final response = result.data?['updateUserLanguage'];
      if (response?['success'] == false) {
        throw Exception('Server rejected language update: ${response?['message']}');
      }

      // Update last sync timestamp
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());

    } catch (e) {
      // For offline mode, we'll sync later when online
      if (e.toString().contains('Network')) {
        print('Network error - will sync language preference when online');
        return;
      }
      rethrow;
    }
  }

  /// Get language from user profile (API call)
  Future<String?> getUserLanguageFromApi() async {
    try {
      final client = GraphQLClientManager.instance.getClient();

      final result = await client.query(
        options: QueryOptions(
          document: gql('''
            query GetUserLanguage {
              me {
                id
                languagePreference
              }
            }
          '''),
        ),
      );

      if (result.hasException) {
        throw Exception('Failed to fetch user language: ${result.exception}');
      }

      final user = result.data?['me'];
      return user?['languagePreference'];

    } catch (e) {
      print('Warning: Could not fetch user language from API: $e');
      return null;
    }
  }

  /// Sync language preference on app startup
  Future<void> syncOnStartup() async {
    try {
      // Get local preference
      final localLanguage = await getCurrentLanguage();

      // Try to get from API
      final apiLanguage = await getUserLanguageFromApi();

      if (apiLanguage != null && apiLanguage != localLanguage) {
        // API has different preference, update local
        await setLanguage(apiLanguage);
      } else if (apiLanguage == null) {
        // No API preference, push local preference to API
        await _syncLanguageWithApi(localLanguage);
      }

      // Update local translations
      await _updateLocalTranslations(localLanguage);

    } catch (e) {
      print('Warning: Language sync on startup failed: $e');
    }
  }

  /// Update local cached translations
  Future<void> _updateLocalTranslations(String languageCode) async {
    try {
      // Check if we need to update translations
      final lastSync = await _getLastSyncTime();
      final now = DateTime.now();

      // Update if never synced or if more than 24 hours old
      if (lastSync == null || now.difference(lastSync).inHours > 24) {
        final translations = await _fetchTranslationsFromApi(languageCode);
        if (translations != null) {
          await _cacheTranslations(translations, languageCode);
        }
      }
    } catch (e) {
      print('Warning: Failed to update local translations: $e');
    }
  }

  /// Fetch translations from web API
  Future<Map<String, dynamic>?> _fetchTranslationsFromApi(String languageCode) async {
    try {
      // This would typically be a REST endpoint or GraphQL query
      // For now, we'll use a placeholder implementation

      final client = GraphQLClientManager.instance.getClient();

      final result = await client.query(
        options: QueryOptions(
          document: gql('''
            query GetMobileTranslations(\$language: String!) {
              mobileTranslations(language: \$language) {
                common
                forms
                harvest
                dashboard
                errors
              }
            }
          '''),
          variables: {'language': languageCode},
        ),
      );

      if (result.hasException) {
        throw Exception('Failed to fetch translations: ${result.exception}');
      }

      return result.data?['mobileTranslations'];

    } catch (e) {
      print('Warning: Could not fetch translations from API: $e');
      return null;
    }
  }

  /// Cache translations locally
  Future<void> _cacheTranslations(Map<String, dynamic> translations, String languageCode) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final translationsJson = jsonEncode(translations);
      final cacheKey = '${_translationsKey}_$languageCode';

      await prefs.setString(cacheKey, translationsJson);
      await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());

    } catch (e) {
      print('Warning: Failed to cache translations: $e');
    }
  }

  /// Get cached translations
  Future<Map<String, dynamic>?> getCachedTranslations(String languageCode) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKey = '${_translationsKey}_$languageCode';
      final translationsJson = prefs.getString(cacheKey);

      if (translationsJson != null) {
        return jsonDecode(translationsJson) as Map<String, dynamic>;
      }

      return null;
    } catch (e) {
      print('Warning: Failed to get cached translations: $e');
      return null;
    }
  }

  /// Get last sync time
  Future<DateTime?> _getLastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    final lastSyncString = prefs.getString(_lastSyncKey);

    if (lastSyncString != null) {
      return DateTime.tryParse(lastSyncString);
    }

    return null;
  }

  /// Validate language code
  bool _isValidLanguageCode(String code) {
    const validCodes = ['en', 'id'];
    return validCodes.contains(code.toLowerCase());
  }

  /// Get display name for language code
  String getLanguageDisplayName(String languageCode) {
    switch (languageCode.toLowerCase()) {
      case 'en':
        return 'English';
      case 'id':
        return 'Bahasa Indonesia';
      default:
        return languageCode.toUpperCase();
    }
  }

  /// Get all supported languages
  List<Map<String, String>> getSupportedLanguages() {
    return [
      {
        'code': 'en',
        'name': 'English',
        'nativeName': 'English',
        'flag': '🇺🇸',
      },
      {
        'code': 'id',
        'name': 'Indonesian',
        'nativeName': 'Bahasa Indonesia',
        'flag': '🇮🇩',
      },
    ];
  }

  /// Clear all language data (useful for testing)
  Future<void> clearLanguageData() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.remove(_languageKey);
    await prefs.remove(_lastSyncKey);
    await prefs.remove('${_translationsKey}_en');
    await prefs.remove('${_translationsKey}_id');
  }

  /// Get sync status
  Future<Map<String, dynamic>> getSyncStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final currentLanguage = await getCurrentLanguage();
    final lastSync = await _getLastSyncTime();
    final hasCachedTranslations = await getCachedTranslations(currentLanguage);

    return {
      'currentLanguage': currentLanguage,
      'lastSync': lastSync?.toIso8601String(),
      'hasCachedTranslations': hasCachedTranslations != null,
      'needsSync': lastSync == null ||
                   DateTime.now().difference(lastSync!).inHours > 24,
    };
  }

  /// Force immediate sync (for manual refresh)
  Future<void> forceSync() async {
    final currentLanguage = await getCurrentLanguage();
    await _updateLocalTranslations(currentLanguage);
    await _syncLanguageWithApi(currentLanguage);
  }
}

/// GraphQL mutations and queries for language features
class LanguageSyncQueries {
  static const String updateUserLanguage = '''
    mutation UpdateUserLanguage(\$language: String!) {
      updateUserLanguage(language: \$language) {
        success
        message
        user {
          id
          languagePreference
        }
      }
    }
  ''';

  static const String getUserLanguage = '''
    query GetUserLanguage {
      me {
        id
        languagePreference
      }
    }
  ''';

  static const String getMobileTranslations = '''
    query GetMobileTranslations(\$language: String!) {
      mobileTranslations(language: \$language) {
        common
        forms
        harvest
        dashboard
        errors
        navigation
        buttons
        validation
      }
    }
  ''';
}