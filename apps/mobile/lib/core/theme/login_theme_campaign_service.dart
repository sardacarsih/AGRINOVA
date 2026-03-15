import 'dart:async' show unawaited;
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_constants.dart';

typedef LoginThemeCampaignFetcher = Future<Map<String, dynamic>> Function();

String _colorToHex(Color color) {
  final value = color.toARGB32();
  return '#${value.toRadixString(16).padLeft(8, '0').toUpperCase()}';
}

enum LoginThemeSelectionMode { auto, manual }

class LoginThemeTokenSet {
  final List<Color> bgGradient;
  final Color surface;
  final Color surfaceBorder;
  final Color textPrimary;
  final Color textSecondary;
  final Color inputFill;
  final Color inputBorder;
  final List<Color> buttonGradient;
  final Color buttonText;
  final Color link;

  const LoginThemeTokenSet({
    required this.bgGradient,
    required this.surface,
    required this.surfaceBorder,
    required this.textPrimary,
    required this.textSecondary,
    required this.inputFill,
    required this.inputBorder,
    required this.buttonGradient,
    required this.buttonText,
    required this.link,
  });

  Map<String, dynamic> toJson() {
    return {
      'bgGradient': bgGradient.map(_colorToHex).toList(),
      'surface': _colorToHex(surface),
      'surfaceBorder': _colorToHex(surfaceBorder),
      'textPrimary': _colorToHex(textPrimary),
      'textSecondary': _colorToHex(textSecondary),
      'inputFill': _colorToHex(inputFill),
      'inputBorder': _colorToHex(inputBorder),
      'buttonGradient': buttonGradient.map(_colorToHex).toList(),
      'buttonText': _colorToHex(buttonText),
      'link': _colorToHex(link),
    };
  }
}

class LoginThemeAssetManifest {
  final String backgroundImage;
  final String illustration;
  final String iconPack;
  final String accentAsset;

  const LoginThemeAssetManifest({
    required this.backgroundImage,
    required this.illustration,
    required this.iconPack,
    required this.accentAsset,
  });

  static const LoginThemeAssetManifest empty = LoginThemeAssetManifest(
    backgroundImage: '',
    illustration: '',
    iconPack: 'outline-enterprise',
    accentAsset: 'none',
  );

  Map<String, dynamic> toJson() {
    return {
      'backgroundImage': backgroundImage,
      'illustration': illustration,
      'iconPack': iconPack,
      'accentAsset': accentAsset,
    };
  }
}

class LoginThemeCampaignTheme {
  final String id;
  final String label;
  final LoginThemeTokenSet lightTokens;
  final LoginThemeTokenSet? darkTokens;
  final LoginThemeAssetManifest assets;

  const LoginThemeCampaignTheme({
    required this.id,
    required this.label,
    required this.lightTokens,
    this.darkTokens,
    this.assets = LoginThemeAssetManifest.empty,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'lightTokens': lightTokens.toJson(),
      'darkTokens': darkTokens?.toJson(),
      'assets': assets.toJson(),
    };
  }
}

class LoginThemeCampaignConfig {
  final String version;
  final DateTime? updatedAt;
  final String? activeThemeId;
  final List<LoginThemeCampaignTheme> themes;

  const LoginThemeCampaignConfig({
    required this.version,
    required this.updatedAt,
    required this.activeThemeId,
    required this.themes,
  });

  Map<String, dynamic> toJson() {
    return {
      'version': version,
      'updatedAt': updatedAt?.toIso8601String(),
      'activeThemeId': activeThemeId,
      'themes': themes.map((theme) => theme.toJson()).toList(),
    };
  }
}

class LoginThemeRuntimeMetadata {
  final String source;
  final bool killSwitchEnabled;
  final String? campaignId;
  final String? campaignName;

  const LoginThemeRuntimeMetadata({
    required this.source,
    required this.killSwitchEnabled,
    this.campaignId,
    this.campaignName,
  });

  static const LoginThemeRuntimeMetadata unknown = LoginThemeRuntimeMetadata(
    source: 'UNKNOWN',
    killSwitchEnabled: false,
  );

  Map<String, dynamic> toJson() {
    return {
      'source': source,
      'killSwitchEnabled': killSwitchEnabled,
      'campaignId': campaignId,
      'campaignName': campaignName,
    };
  }

  static LoginThemeRuntimeMetadata fromJson(Map<String, dynamic> json) {
    return LoginThemeRuntimeMetadata(
      source: json['source']?.toString().trim().isNotEmpty == true
          ? json['source'].toString().trim()
          : LoginThemeRuntimeMetadata.unknown.source,
      killSwitchEnabled: json['killSwitchEnabled'] == true,
      campaignId: json['campaignId']?.toString(),
      campaignName: json['campaignName']?.toString(),
    );
  }
}

class LoginThemeRuntimeDiagnostics {
  final String source;
  final DateTime? lastFetchedAt;
  final Duration? cacheAge;
  final bool isUsingFallback;
  final bool isCacheAvailable;
  final bool isStale;
  final String? lastError;

  const LoginThemeRuntimeDiagnostics({
    required this.source,
    required this.lastFetchedAt,
    required this.cacheAge,
    required this.isUsingFallback,
    required this.isCacheAvailable,
    required this.isStale,
    required this.lastError,
  });
}

class _ParsedRemoteThemePayload {
  final LoginThemeCampaignConfig config;
  final LoginThemeRuntimeMetadata metadata;

  const _ParsedRemoteThemePayload({
    required this.config,
    required this.metadata,
  });
}

class _RuntimeThemeHttpPayload {
  final Map<String, dynamic> data;

  const _RuntimeThemeHttpPayload(this.data);

  factory _RuntimeThemeHttpPayload.fromDynamic(dynamic rawData) {
    if (rawData is Map<String, dynamic>) {
      return _RuntimeThemeHttpPayload(rawData);
    }
    if (rawData is Map) {
      return _RuntimeThemeHttpPayload(Map<String, dynamic>.from(rawData));
    }
    throw Exception('Invalid login theme payload format');
  }
}

/// Server-driven login campaign theme service with layered fallback:
/// remote payload -> cached payload -> built-in normal theme.
class LoginThemeCampaignService extends ChangeNotifier {
  LoginThemeCampaignService._internal({
    LoginThemeCampaignFetcher? fetcher,
    DateTime Function()? now,
    Duration cacheTtl = const Duration(hours: 6),
    SharedPreferences? prefs,
  }) : _fetcher = fetcher,
       _now = now ?? DateTime.now,
       _cacheTtl = cacheTtl,
       _prefs = prefs;

  static final LoginThemeCampaignService instance =
      LoginThemeCampaignService._internal();

  @visibleForTesting
  factory LoginThemeCampaignService.test({
    LoginThemeCampaignFetcher? fetcher,
    DateTime Function()? now,
    Duration cacheTtl = const Duration(hours: 6),
    SharedPreferences? prefs,
  }) {
    return LoginThemeCampaignService._internal(
      fetcher: fetcher,
      now: now,
      cacheTtl: cacheTtl,
      prefs: prefs,
    );
  }

  static const String endpointPath = ApiConstants.loginThemeCampaignPath;

  static const String _selectionModeKey = 'login_theme_selection_mode';
  static const String _selectionIdKey = 'login_theme_selection_id';
  static const String _payloadCacheKey = 'login_theme_payload_cache';
  static const String _payloadFetchedAtKey = 'login_theme_payload_fetched_at';
  static const String _runtimeMetadataCacheKey =
      'login_theme_runtime_metadata_cache';
  static const String _autoModeValue = 'auto';
  static const String _manualModeValue = 'manual';
  static const Map<String, dynamic> _defaultRuntimeQueryParameters = {
    'platform': 'mobile',
  };

  final LoginThemeCampaignFetcher? _fetcher;
  final DateTime Function() _now;
  final Duration _cacheTtl;
  SharedPreferences? _prefs;

  bool _initialized = false;
  bool _isFetching = false;
  LoginThemeCampaignConfig? _config;
  LoginThemeSelectionMode _selectionMode = LoginThemeSelectionMode.auto;
  String? _selectedThemeId;
  DateTime? _lastFetchedAt;
  LoginThemeRuntimeMetadata _runtimeMetadata =
      LoginThemeRuntimeMetadata.unknown;
  String? _lastFetchError;

  static const LoginThemeTokenSet _defaultLightTokens = LoginThemeTokenSet(
    bgGradient: [Color(0xFFF8FAFC), Color(0xFFE2E8F0), Color(0xFFDBEAFE)],
    surface: Color(0xBFFFFFFF),
    surfaceBorder: Color(0xFFCBD5E1),
    textPrimary: Color(0xFF0F172A),
    textSecondary: Color(0xFF334155),
    inputFill: Color(0xF2FFFFFF),
    inputBorder: Color(0xFFCBD5E1),
    buttonGradient: [Color(0xFF00FF87), Color(0xFF00D9FF)],
    buttonText: Color(0xFF0F172A),
    link: Color(0xFF0369A1),
  );

  static const LoginThemeTokenSet _defaultDarkTokens = LoginThemeTokenSet(
    bgGradient: [Color(0xFF1A1A2E), Color(0xFF16213E), Color(0xFF0F3460)],
    surface: Color(0x1AFFFFFF),
    surfaceBorder: Color(0x29FFFFFF),
    textPrimary: Color(0xFFFFFFFF),
    textSecondary: Color(0xFFB7C3D4),
    inputFill: Color(0x14FFFFFF),
    inputBorder: Color(0x29FFFFFF),
    buttonGradient: [Color(0xFF00FF87), Color(0xFF00D9FF)],
    buttonText: Color(0xFF1A1A2E),
    link: Color(0xFF00D9FF),
  );

  static const LoginThemeCampaignTheme _fallbackTheme = LoginThemeCampaignTheme(
    id: 'normal',
    label: 'Normal',
    lightTokens: _defaultLightTokens,
    darkTokens: _defaultDarkTokens,
    assets: LoginThemeAssetManifest.empty,
  );

  bool get isInitialized => _initialized;
  bool get isFetching => _isFetching;
  bool get isAutoMode => _selectionMode == LoginThemeSelectionMode.auto;
  LoginThemeSelectionMode get selectionMode => _selectionMode;
  String? get selectedThemeId => _selectedThemeId;
  DateTime? get lastFetchedAt => _lastFetchedAt;
  LoginThemeRuntimeMetadata get runtimeMetadata => _runtimeMetadata;
  LoginThemeRuntimeDiagnostics get runtimeDiagnostics {
    final lastFetchedAt = _lastFetchedAt;
    final cacheAge = lastFetchedAt == null
        ? null
        : _now().difference(lastFetchedAt);
    final isCacheAvailable = _config != null && lastFetchedAt != null;
    return LoginThemeRuntimeDiagnostics(
      source: _runtimeMetadata.source,
      lastFetchedAt: lastFetchedAt,
      cacheAge: cacheAge,
      isUsingFallback: effectiveThemeId == _fallbackTheme.id,
      isCacheAvailable: isCacheAvailable,
      isStale: isCacheAvailable ? !_isCacheFresh() : false,
      lastError: _lastFetchError,
    );
  }

  List<LoginThemeCampaignTheme> get availableThemes {
    final merged = <String, LoginThemeCampaignTheme>{
      _fallbackTheme.id: _fallbackTheme,
    };
    final serverThemes = _config?.themes ?? const <LoginThemeCampaignTheme>[];
    for (final theme in serverThemes) {
      merged[theme.id] = theme;
    }
    return merged.values.toList(growable: false);
  }

  String get effectiveThemeId {
    final themesById = _themesById();
    if (_selectionMode == LoginThemeSelectionMode.manual &&
        _selectedThemeId != null &&
        themesById.containsKey(_selectedThemeId)) {
      return _selectedThemeId!;
    }
    final activeId = _config?.activeThemeId;
    if (activeId != null && themesById.containsKey(activeId)) {
      return activeId;
    }
    return _fallbackTheme.id;
  }

  String get effectiveThemeLabel {
    final theme = _themesById()[effectiveThemeId];
    return theme?.label ?? _fallbackTheme.label;
  }

  LoginThemeAssetManifest get effectiveAssets {
    final theme = _themesById()[effectiveThemeId];
    return theme?.assets ?? LoginThemeAssetManifest.empty;
  }

  Future<void> initialize() async {
    if (_initialized) return;

    _prefs ??= await SharedPreferences.getInstance();
    _selectionMode = _parseSelectionMode(_prefs?.getString(_selectionModeKey));
    _selectedThemeId = _prefs?.getString(_selectionIdKey);
    _lastFetchedAt = _tryParseDate(_prefs?.getString(_payloadFetchedAtKey));

    final rawPayload = _prefs?.getString(_payloadCacheKey);
    if (rawPayload != null && rawPayload.isNotEmpty) {
      _config = _tryParseConfigFromRaw(rawPayload);
    }
    _runtimeMetadata = _loadCachedRuntimeMetadata();

    _sanitizeSelection();
    _initialized = true;
    notifyListeners();

    unawaited(refreshIfStale());
  }

  Future<void> refreshIfStale({bool force = false}) async {
    if (force) {
      await refresh(force: true);
      return;
    }
    if (_isCacheFresh()) return;

    if (_config != null) {
      // Keep stale cache visible while refresh runs in the background.
      unawaited(refresh(force: true));
      return;
    }

    await refresh(force: true);
  }

  Future<void> refresh({bool force = false}) async {
    if (_isFetching) return;
    if (!force && _isCacheFresh()) return;

    _isFetching = true;
    notifyListeners();

    try {
      final payloadMap = await (_fetcher?.call() ?? _defaultFetch());
      final parsedPayload = _parseRemotePayload(payloadMap);
      if (parsedPayload == null) {
        _lastFetchError = 'runtime theme payload rejected';
        return;
      }

      _config = parsedPayload.config;
      _runtimeMetadata = parsedPayload.metadata;
      _lastFetchedAt = _now();
      _lastFetchError = null;
      _sanitizeSelection();
      await _persistConfig();
      notifyListeners();
    } catch (error) {
      _lastFetchError = error.toString();
      // Keep existing cache/fallback on all remote errors.
    } finally {
      _isFetching = false;
      notifyListeners();
    }
  }

  Future<void> setAutoMode() async {
    _selectionMode = LoginThemeSelectionMode.auto;
    _selectedThemeId = null;
    await _persistSelection();
    notifyListeners();
  }

  Future<void> setManualTheme(String themeId) async {
    final themesById = _themesById();
    if (!themesById.containsKey(themeId)) return;

    _selectionMode = LoginThemeSelectionMode.manual;
    _selectedThemeId = themeId;
    await _persistSelection();
    notifyListeners();
  }

  LoginThemeTokenSet resolveTokens({required Brightness brightness}) {
    final theme = _themesById()[effectiveThemeId] ?? _fallbackTheme;
    if (brightness == Brightness.dark) {
      return theme.darkTokens ?? _fallbackTheme.darkTokens!;
    }
    return theme.lightTokens;
  }

  Future<Map<String, dynamic>> _defaultFetch() async {
    final client = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
        headers: const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );
    final response = await client.get(
      endpointPath,
      queryParameters: _defaultRuntimeQueryParameters,
    );
    return _RuntimeThemeHttpPayload.fromDynamic(response.data).data;
  }

  Map<String, LoginThemeCampaignTheme> _themesById() {
    final merged = <String, LoginThemeCampaignTheme>{
      _fallbackTheme.id: _fallbackTheme,
    };
    final serverThemes = _config?.themes ?? const <LoginThemeCampaignTheme>[];
    for (final theme in serverThemes) {
      merged[theme.id] = theme;
    }
    return merged;
  }

  bool _isCacheFresh() {
    if (_config == null || _lastFetchedAt == null) return false;
    return _now().difference(_lastFetchedAt!) < _cacheTtl;
  }

  Future<void> _persistSelection() async {
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.setString(
      _selectionModeKey,
      _selectionMode == LoginThemeSelectionMode.auto
          ? _autoModeValue
          : _manualModeValue,
    );
    if (_selectedThemeId == null) {
      await _prefs!.remove(_selectionIdKey);
    } else {
      await _prefs!.setString(_selectionIdKey, _selectedThemeId!);
    }
  }

  Future<void> _persistConfig() async {
    _prefs ??= await SharedPreferences.getInstance();
    final config = _config;
    final fetchedAt = _lastFetchedAt;
    if (config == null || fetchedAt == null) return;

    await _prefs!.setString(_payloadCacheKey, jsonEncode(config.toJson()));
    await _prefs!.setString(_payloadFetchedAtKey, fetchedAt.toIso8601String());
    await _prefs!.setString(
      _runtimeMetadataCacheKey,
      jsonEncode(_runtimeMetadata.toJson()),
    );
  }

  LoginThemeRuntimeMetadata _loadCachedRuntimeMetadata() {
    final rawMetadata = _prefs?.getString(_runtimeMetadataCacheKey);
    if (rawMetadata == null || rawMetadata.isEmpty) {
      return LoginThemeRuntimeMetadata.unknown;
    }

    try {
      final decoded = jsonDecode(rawMetadata);
      if (decoded is Map<String, dynamic>) {
        return LoginThemeRuntimeMetadata.fromJson(decoded);
      }
      if (decoded is Map) {
        return LoginThemeRuntimeMetadata.fromJson(
          Map<String, dynamic>.from(decoded),
        );
      }
      return LoginThemeRuntimeMetadata.unknown;
    } catch (_) {
      return LoginThemeRuntimeMetadata.unknown;
    }
  }

  void _sanitizeSelection() {
    if (_selectionMode != LoginThemeSelectionMode.manual) return;
    final selectedThemeId = _selectedThemeId;
    if (selectedThemeId == null) {
      _selectionMode = LoginThemeSelectionMode.auto;
      return;
    }
    if (!_themesById().containsKey(selectedThemeId)) {
      _selectionMode = LoginThemeSelectionMode.auto;
      _selectedThemeId = null;
      unawaited(_persistSelection());
    }
  }

  LoginThemeSelectionMode _parseSelectionMode(String? rawMode) {
    if (rawMode == _manualModeValue) {
      return LoginThemeSelectionMode.manual;
    }
    return LoginThemeSelectionMode.auto;
  }

  DateTime? _tryParseDate(String? rawDate) {
    if (rawDate == null || rawDate.isEmpty) return null;
    return DateTime.tryParse(rawDate);
  }

  LoginThemeCampaignConfig? _tryParseConfigFromRaw(String rawPayload) {
    try {
      final decoded = jsonDecode(rawPayload);
      if (decoded is Map<String, dynamic>) {
        return _parseRemotePayload(decoded)?.config;
      }
      if (decoded is Map) {
        return _parseRemotePayload(Map<String, dynamic>.from(decoded))?.config;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  _ParsedRemoteThemePayload? _parseRemotePayload(Map<String, dynamic> raw) {
    final runtimePayload = _tryParseRuntimePayload(raw);
    if (runtimePayload != null) {
      return runtimePayload;
    }

    final legacyConfig = _tryParseLegacyConfigMap(raw);
    if (legacyConfig == null) return null;
    return _ParsedRemoteThemePayload(
      config: legacyConfig,
      metadata: LoginThemeRuntimeMetadata.unknown,
    );
  }

  _ParsedRemoteThemePayload? _tryParseRuntimePayload(Map<String, dynamic> raw) {
    final normalized = _normalizeRuntimePayload(raw);
    final source = normalized['source']?.toString().trim();
    final themeRaw = normalized['theme'];
    if (source == null || source.isEmpty || themeRaw is! Map) {
      return null;
    }

    final themeMap = Map<String, dynamic>.from(themeRaw);
    final themeId = themeMap['id']?.toString().trim();
    if (themeId == null || themeId.isEmpty) {
      return null;
    }

    final campaignMap = normalized['campaign'] is Map
        ? Map<String, dynamic>.from(normalized['campaign'] as Map)
        : null;
    final tokenMap = _extractTokenMap(normalized, themeMap);
    final runtimeAssets = _extractRuntimeAssetManifest(normalized, themeMap);
    final themeLabel = _resolveRuntimeThemeLabel(themeMap, campaignMap);
    final updatedAt = _resolveRuntimeUpdatedAt(themeMap, campaignMap);
    final campaignId = campaignMap?['id']?.toString();

    final lightTokens = _buildRuntimeTokenSet(
      tokenMap,
      brightness: Brightness.light,
    );
    final darkTokens = _buildRuntimeTokenSet(
      tokenMap,
      brightness: Brightness.dark,
    );

    final runtimeTheme = LoginThemeCampaignTheme(
      id: themeId,
      label: themeLabel,
      lightTokens: lightTokens,
      darkTokens: darkTokens,
      assets: runtimeAssets,
    );
    final config = LoginThemeCampaignConfig(
      version: _buildRuntimeVersion(
        source: source,
        themeId: themeId,
        campaignId: campaignId,
        updatedAt: updatedAt,
      ),
      updatedAt: updatedAt,
      activeThemeId: themeId,
      themes: [runtimeTheme],
    );

    return _ParsedRemoteThemePayload(
      config: config,
      metadata: LoginThemeRuntimeMetadata(
        source: source,
        killSwitchEnabled: normalized['kill_switch_enabled'] == true,
        campaignId: campaignId,
        campaignName: campaignMap?['campaign_name']?.toString(),
      ),
    );
  }

  LoginThemeCampaignConfig? _tryParseLegacyConfigMap(Map<String, dynamic> raw) {
    final normalized = _normalizeLegacyPayload(raw);
    final version = normalized['version']?.toString().trim();
    final themesRaw = normalized['themes'];
    if (version == null || version.isEmpty || themesRaw is! List) {
      return null;
    }

    final themes = <LoginThemeCampaignTheme>[];
    for (final item in themesRaw) {
      if (item is! Map) continue;
      final theme = _parseTheme(Map<String, dynamic>.from(item));
      if (theme != null) {
        themes.add(theme);
      }
    }

    if (themes.isEmpty) {
      return null;
    }

    final activeThemeId = normalized['activeThemeId']?.toString();
    return LoginThemeCampaignConfig(
      version: version,
      updatedAt: _tryParseDate(normalized['updatedAt']?.toString()),
      activeThemeId: activeThemeId?.isEmpty ?? true ? null : activeThemeId,
      themes: themes,
    );
  }

  Map<String, dynamic> _normalizeRuntimePayload(Map<String, dynamic> raw) {
    if (raw.containsKey('source') && raw.containsKey('theme')) {
      return raw;
    }
    final data = raw['data'];
    if (data is Map<String, dynamic> &&
        data.containsKey('source') &&
        data.containsKey('theme')) {
      return data;
    }
    if (data is Map &&
        data.containsKey('source') &&
        data.containsKey('theme')) {
      return Map<String, dynamic>.from(data);
    }
    return raw;
  }

  Map<String, dynamic> _normalizeLegacyPayload(Map<String, dynamic> raw) {
    if (raw.containsKey('themes')) {
      return raw;
    }
    final data = raw['data'];
    if (data is Map<String, dynamic> && data.containsKey('themes')) {
      return data;
    }
    if (data is Map && data.containsKey('themes')) {
      return Map<String, dynamic>.from(data);
    }
    return raw;
  }

  Map<String, dynamic> _extractTokenMap(
    Map<String, dynamic> normalized,
    Map<String, dynamic> themeMap,
  ) {
    final tokenRaw = normalized['token_json'] ?? themeMap['token_json'];
    if (tokenRaw is Map<String, dynamic>) {
      return tokenRaw;
    }
    if (tokenRaw is Map) {
      return Map<String, dynamic>.from(tokenRaw);
    }
    return <String, dynamic>{};
  }

  LoginThemeAssetManifest _extractRuntimeAssetManifest(
    Map<String, dynamic> normalized,
    Map<String, dynamic> themeMap,
  ) {
    final candidates = [
      _toMap(normalized['asset_manifest_json']),
      _toMap(normalized['assets_json']),
      _toMap(normalized['assets']),
      _toMap(themeMap['asset_manifest_json']),
      _toMap(themeMap['assets_json']),
      _toMap(themeMap['assets']),
    ];

    for (final candidate in candidates) {
      if (candidate == null) continue;

      final platformAssets = _toMap(candidate['mobile']);
      final webAssets = _toMap(candidate['web']);
      final backgroundImage = _normalizeAssetUrl(
        _readString(platformAssets, 'backgroundImage') ??
            _readString(candidate, 'backgroundImage') ??
            _readString(webAssets, 'backgroundImage'),
      );
      final illustration = _normalizeAssetUrl(
        _readString(platformAssets, 'illustration') ??
            _readString(candidate, 'illustration') ??
            _readString(webAssets, 'illustration'),
      );
      final iconPack =
          _readString(platformAssets, 'iconPack') ??
          _readString(candidate, 'iconPack') ??
          _readString(webAssets, 'iconPack') ??
          LoginThemeAssetManifest.empty.iconPack;
      final accentAsset =
          _readString(platformAssets, 'accentAsset') ??
          _readString(candidate, 'accentAsset') ??
          _readString(webAssets, 'accentAsset') ??
          LoginThemeAssetManifest.empty.accentAsset;

      if (backgroundImage.isNotEmpty ||
          illustration.isNotEmpty ||
          iconPack.isNotEmpty ||
          accentAsset.isNotEmpty) {
        return LoginThemeAssetManifest(
          backgroundImage: backgroundImage,
          illustration: illustration,
          iconPack: iconPack,
          accentAsset: accentAsset,
        );
      }
    }

    return LoginThemeAssetManifest.empty;
  }

  Map<String, dynamic>? _toMap(dynamic raw) {
    if (raw is Map<String, dynamic>) {
      return raw;
    }
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    return null;
  }

  String? _readString(Map<String, dynamic>? map, String key) {
    if (map == null) return null;
    final value = map[key];
    if (value is! String) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    return trimmed;
  }

  String _normalizeAssetUrl(String? rawValue) {
    if (rawValue == null) return '';
    final value = rawValue.trim();
    if (value.isEmpty) return '';
    final lower = value.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:') ||
        lower.startsWith('blob:')) {
      return value;
    }

    final withoutDotPrefix = value.startsWith('./')
        ? value.substring(2)
        : value;
    final withLeadingSlash = withoutDotPrefix.startsWith('/')
        ? withoutDotPrefix
        : '/$withoutDotPrefix';
    final baseUrl = ApiConstants.baseUrl.trim();
    if (baseUrl.isEmpty) {
      return withLeadingSlash;
    }

    final normalizedBase = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    return '$normalizedBase$withLeadingSlash';
  }

  String _resolveRuntimeThemeLabel(
    Map<String, dynamic> themeMap,
    Map<String, dynamic>? campaignMap,
  ) {
    final campaignName = campaignMap?['campaign_name']?.toString().trim();
    if (campaignName != null && campaignName.isNotEmpty) {
      return campaignName;
    }
    final themeName = themeMap['name']?.toString().trim();
    if (themeName != null && themeName.isNotEmpty) {
      return themeName;
    }
    final code = themeMap['code']?.toString().trim();
    if (code != null && code.isNotEmpty) {
      return code;
    }
    return 'Campaign Theme';
  }

  DateTime? _resolveRuntimeUpdatedAt(
    Map<String, dynamic> themeMap,
    Map<String, dynamic>? campaignMap,
  ) {
    final campaignUpdatedAt = _tryParseDate(
      campaignMap?['updated_at']?.toString(),
    );
    if (campaignUpdatedAt != null) {
      return campaignUpdatedAt;
    }
    return _tryParseDate(themeMap['updated_at']?.toString());
  }

  String _buildRuntimeVersion({
    required String source,
    required String themeId,
    required String? campaignId,
    required DateTime? updatedAt,
  }) {
    final safeCampaignId = campaignId == null || campaignId.isEmpty
        ? 'no-campaign'
        : campaignId;
    final timestamp = updatedAt?.toIso8601String() ?? 'no-updated-at';
    return '$source|$themeId|$safeCampaignId|$timestamp';
  }

  LoginThemeTokenSet _buildRuntimeTokenSet(
    Map<String, dynamic> rawTokens, {
    required Brightness brightness,
  }) {
    final defaults = brightness == Brightness.dark
        ? _defaultDarkTokens
        : _defaultLightTokens;

    final directTokenSet = _parseTokenSet(rawTokens);
    if (directTokenSet != null && _passesContrastValidation(directTokenSet)) {
      return directTokenSet;
    }

    final nestedTokensRaw =
        rawTokens[brightness == Brightness.dark ? 'darkTokens' : 'lightTokens'];
    if (nestedTokensRaw is Map) {
      final nestedTokenSet = _parseTokenSet(
        Map<String, dynamic>.from(nestedTokensRaw),
      );
      if (nestedTokenSet != null && _passesContrastValidation(nestedTokenSet)) {
        return nestedTokenSet;
      }
    }

    final bgGradient =
        _parseColorList(rawTokens['bgGradient']) ?? defaults.bgGradient;
    final surface = _parseColor(rawTokens['surface']) ?? defaults.surface;
    final accentColor = _parseColor(rawTokens['accentColor']);
    final accentSoftColor = _parseColor(rawTokens['accentSoftColor']);
    final loginCardBorder = _parseColor(rawTokens['loginCardBorder']);
    final buttonGradientFromTokens = _parseColorList(
      rawTokens['buttonGradient'],
    );

    final fallbackButtonStart = accentColor ?? defaults.buttonGradient.first;
    final fallbackButtonEnd = accentSoftColor ?? defaults.buttonGradient.last;
    final buttonGradient =
        buttonGradientFromTokens ?? [fallbackButtonStart, fallbackButtonEnd];

    final tokenSet = LoginThemeTokenSet(
      bgGradient: bgGradient,
      surface: surface,
      surfaceBorder:
          _parseColor(rawTokens['surfaceBorder']) ??
          loginCardBorder ??
          defaults.surfaceBorder,
      textPrimary:
          _parseColor(rawTokens['textPrimary']) ?? defaults.textPrimary,
      textSecondary:
          _parseColor(rawTokens['textSecondary']) ?? defaults.textSecondary,
      inputFill: _parseColor(rawTokens['inputFill']) ?? defaults.inputFill,
      inputBorder:
          _parseColor(rawTokens['inputBorder']) ??
          loginCardBorder ??
          defaults.inputBorder,
      buttonGradient: buttonGradient,
      buttonText: _parseColor(rawTokens['buttonText']) ?? defaults.buttonText,
      link: _parseColor(rawTokens['link']) ?? accentColor ?? defaults.link,
    );

    if (_passesContrastValidation(tokenSet)) {
      return tokenSet;
    }
    return defaults;
  }

  LoginThemeCampaignTheme? _parseTheme(Map<String, dynamic> rawTheme) {
    final id = rawTheme['id']?.toString().trim();
    final label = rawTheme['label']?.toString().trim();
    final lightTokensRaw = rawTheme['lightTokens'];
    if (id == null ||
        id.isEmpty ||
        label == null ||
        label.isEmpty ||
        lightTokensRaw is! Map) {
      return null;
    }

    final lightTokens = _parseTokenSet(
      Map<String, dynamic>.from(lightTokensRaw),
    );
    if (lightTokens == null || !_passesContrastValidation(lightTokens)) {
      return null;
    }

    LoginThemeTokenSet? darkTokens;
    final darkTokensRaw = rawTheme['darkTokens'];
    if (darkTokensRaw is Map) {
      final parsedDark = _parseTokenSet(
        Map<String, dynamic>.from(darkTokensRaw),
      );
      if (parsedDark != null && _passesContrastValidation(parsedDark)) {
        darkTokens = parsedDark;
      }
    }

    final assets =
        _parseThemeAssets(rawTheme['assets']) ??
        _parseThemeAssets(rawTheme['asset_manifest_json']) ??
        LoginThemeAssetManifest.empty;

    return LoginThemeCampaignTheme(
      id: id,
      label: label,
      lightTokens: lightTokens,
      darkTokens: darkTokens,
      assets: assets,
    );
  }

  LoginThemeAssetManifest? _parseThemeAssets(dynamic rawAssets) {
    final map = _toMap(rawAssets);
    if (map == null) {
      return null;
    }

    final backgroundImage = _normalizeAssetUrl(
      _readString(map, 'backgroundImage'),
    );
    final illustration = _normalizeAssetUrl(_readString(map, 'illustration'));
    final iconPack =
        _readString(map, 'iconPack') ?? LoginThemeAssetManifest.empty.iconPack;
    final accentAsset =
        _readString(map, 'accentAsset') ??
        LoginThemeAssetManifest.empty.accentAsset;

    return LoginThemeAssetManifest(
      backgroundImage: backgroundImage,
      illustration: illustration,
      iconPack: iconPack,
      accentAsset: accentAsset,
    );
  }

  LoginThemeTokenSet? _parseTokenSet(Map<String, dynamic> rawTokens) {
    final bgGradient = _parseColorList(rawTokens['bgGradient']);
    final surface = _parseColor(rawTokens['surface']);
    final surfaceBorder = _parseColor(rawTokens['surfaceBorder']);
    final textPrimary = _parseColor(rawTokens['textPrimary']);
    final textSecondary = _parseColor(rawTokens['textSecondary']);
    final inputFill = _parseColor(rawTokens['inputFill']);
    final inputBorder = _parseColor(rawTokens['inputBorder']);
    final buttonGradient = _parseColorList(rawTokens['buttonGradient']);
    final buttonText = _parseColor(rawTokens['buttonText']);
    final link = _parseColor(rawTokens['link']);

    final isMissingAnyRequiredField =
        bgGradient == null ||
        surface == null ||
        surfaceBorder == null ||
        textPrimary == null ||
        textSecondary == null ||
        inputFill == null ||
        inputBorder == null ||
        buttonGradient == null ||
        buttonText == null ||
        link == null;
    if (isMissingAnyRequiredField) {
      return null;
    }

    return LoginThemeTokenSet(
      bgGradient: bgGradient,
      surface: surface,
      surfaceBorder: surfaceBorder,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      inputFill: inputFill,
      inputBorder: inputBorder,
      buttonGradient: buttonGradient,
      buttonText: buttonText,
      link: link,
    );
  }

  List<Color>? _parseColorList(dynamic rawValue) {
    if (rawValue is! List || rawValue.length < 2) {
      return null;
    }
    final colors = <Color>[];
    for (final entry in rawValue) {
      final color = _parseColor(entry);
      if (color == null) return null;
      colors.add(color);
    }
    return colors;
  }

  Color? _parseColor(dynamic rawValue) {
    if (rawValue is int) {
      final value = rawValue <= 0xFFFFFF ? (0xFF000000 | rawValue) : rawValue;
      return Color(value);
    }
    if (rawValue is! String) {
      return null;
    }

    final normalized = rawValue.trim().toLowerCase();
    if (normalized.isEmpty) {
      return null;
    }

    String hex = normalized;
    if (hex.startsWith('#')) {
      hex = hex.substring(1);
    } else if (hex.startsWith('0x')) {
      hex = hex.substring(2);
    }

    if (hex.length == 6) {
      hex = 'ff$hex';
    }
    if (hex.length != 8) {
      return null;
    }

    final value = int.tryParse(hex, radix: 16);
    if (value == null) {
      return null;
    }
    return Color(value);
  }

  bool _passesContrastValidation(LoginThemeTokenSet tokens) {
    final backgroundBase = _toOpaque(
      tokens.bgGradient.first,
      const Color(0xFFFFFFFF),
    );
    final effectiveSurface = _toOpaque(
      Color.alphaBlend(tokens.surface, backgroundBase),
      backgroundBase,
    );

    final textPrimaryRatio = _contrastRatio(
      _toOpaque(tokens.textPrimary, effectiveSurface),
      effectiveSurface,
    );
    final textSecondaryRatio = _contrastRatio(
      _toOpaque(tokens.textSecondary, effectiveSurface),
      effectiveSurface,
    );
    final linkRatio = _contrastRatio(
      _toOpaque(tokens.link, effectiveSurface),
      effectiveSurface,
    );

    var buttonWorstRatio = double.infinity;
    for (final color in tokens.buttonGradient) {
      final ratio = _contrastRatio(
        _toOpaque(tokens.buttonText, color),
        _toOpaque(color, const Color(0xFFFFFFFF)),
      );
      if (ratio < buttonWorstRatio) {
        buttonWorstRatio = ratio;
      }
    }

    return textPrimaryRatio >= 4.5 &&
        textSecondaryRatio >= 4.5 &&
        linkRatio >= 4.5 &&
        buttonWorstRatio >= 4.5;
  }

  Color _toOpaque(Color foreground, Color background) {
    final opaqueBackground = background.withValues(alpha: 1);
    return Color.alphaBlend(foreground, opaqueBackground);
  }

  double _contrastRatio(Color foreground, Color background) {
    final fg = _toOpaque(foreground, background);
    final bg = _toOpaque(background, const Color(0xFFFFFFFF));
    final fgLum = fg.computeLuminance();
    final bgLum = bg.computeLuminance();
    final lighter = fgLum > bgLum ? fgLum : bgLum;
    final darker = fgLum > bgLum ? bgLum : fgLum;
    return (lighter + 0.05) / (darker + 0.05);
  }
}
