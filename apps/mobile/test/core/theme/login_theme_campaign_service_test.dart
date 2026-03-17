import 'dart:async';
import 'dart:convert';

import 'package:agrinova_mobile/core/constants/api_constants.dart';
import 'package:agrinova_mobile/core/theme/login_theme_campaign_service.dart';
import 'package:agrinova_mobile/core/theme/theme_mode_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> _validPayload({
  String activeThemeId = 'lebaran',
  bool includeDarkTokens = true,
}) {
  final lightTokens = {
    'bgGradient': ['#F8FAFC', '#E2E8F0', '#DBEAFE'],
    'surface': '#FFFFFFFF',
    'surfaceBorder': '#CBD5E1',
    'textPrimary': '#0F172A',
    'textSecondary': '#334155',
    'inputFill': '#F8FAFC',
    'inputBorder': '#CBD5E1',
    'buttonGradient': ['#0F766E', '#115E59'],
    'buttonText': '#FFFFFF',
    'link': '#0C4A6E',
  };

  final darkTokens = {
    'bgGradient': ['#0B1F1A', '#12332A', '#1F5A4A'],
    'surface': '#FF10231D',
    'surfaceBorder': '#FF1F4034',
    'textPrimary': '#F9FAFB',
    'textSecondary': '#E5E7EB',
    'inputFill': '#FF163128',
    'inputBorder': '#FF2A5A4A',
    'buttonGradient': ['#14532D', '#166534'],
    'buttonText': '#FFFFFF',
    'link': '#A7F3D0',
  };

  return {
    'version': '1',
    'updatedAt': '2026-03-15T00:00:00Z',
    'activeThemeId': activeThemeId,
    'themes': [
      {
        'id': 'lebaran',
        'label': 'Lebaran',
        'lightTokens': lightTokens,
        if (includeDarkTokens) 'darkTokens': darkTokens,
      },
    ],
  };
}

Map<String, dynamic> _runtimePayload({
  String source = 'ACTIVE_CAMPAIGN',
  bool killSwitchEnabled = false,
  String? campaignId = 'cmp-ramadan-1',
  String? campaignName = 'Ramadan Core',
  Map<String, dynamic>? assetManifestJson,
  Map<String, dynamic>? appUi,
}) {
  return {
    'source': source,
    'kill_switch_enabled': killSwitchEnabled,
    'theme': {
      'id': 'theme-ramadan',
      'code': 'seasonal-ramadan',
      'name': 'Ramadan Harmony',
      'type': 'seasonal',
      'is_active': true,
      'token_json': {
        'accentColor': '#0F766E',
        'accentSoftColor': '#CCFBF1',
        'loginCardBorder': '#2DD4BF',
      },
    },
    if (campaignId != null || campaignName != null)
      'campaign': {
        if (campaignId != null) 'id': campaignId,
        if (campaignName != null) 'campaign_name': campaignName,
        'updated_at': '2026-03-15T10:00:00Z',
      },
    'token_json': {
      'accentColor': '#0F766E',
      'accentSoftColor': '#CCFBF1',
      'loginCardBorder': '#2DD4BF',
    },
    if (assetManifestJson != null) 'asset_manifest_json': assetManifestJson,
    if (appUi != null) 'app_ui': appUi,
  };
}

Future<void> _waitUntilIdle(LoginThemeCampaignService service) async {
  for (var i = 0; i < 100; i++) {
    if (!service.isFetching) {
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
  fail('service did not become idle in time');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    ApiConstants.setBaseUrl('http://localhost:8080');
    await ThemeModeService.instance.setThemeMode(ThemeMode.light);
  });

  test('parses valid payload and resolves active theme in auto mode', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _validPayload(),
    );

    await service.initialize();
    await service.refresh(force: true);

    expect(
      service.availableThemes.any((theme) => theme.id == 'lebaran'),
      isTrue,
    );
    expect(service.effectiveThemeId, equals('lebaran'));
    expect(service.isAutoMode, isTrue);

    final lightTokens = service.resolveTokens(brightness: Brightness.light);
    expect(lightTokens.textPrimary, equals(const Color(0xFF0F172A)));
  });

  test('falls back to built-in normal theme when payload invalid', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => {
        'version': '1',
        'activeThemeId': 'lebaran',
        'themes': [
          {
            'id': 'lebaran',
            'label': 'Lebaran',
            // Missing required token keys.
            'lightTokens': {
              'bgGradient': ['#FFFFFF', '#EEEEEE'],
            },
          },
        ],
      },
    );

    await service.initialize();
    await service.refresh(force: true);

    expect(service.effectiveThemeId, equals('normal'));
    final tokens = service.resolveTokens(brightness: Brightness.light);
    expect(tokens.textPrimary, equals(const Color(0xFF0F172A)));
  });

  test(
    'persists manual selection and cached payload across instances',
    () async {
      final firstService = LoginThemeCampaignService.test(
        fetcher: () async => _validPayload(),
      );
      await firstService.initialize();
      await firstService.refresh(force: true);
      await firstService.setManualTheme('lebaran');

      final secondService = LoginThemeCampaignService.test(
        fetcher: () async => throw Exception('network unavailable'),
      );
      await secondService.initialize();

      expect(
        secondService.selectionMode,
        equals(LoginThemeSelectionMode.manual),
      );
      expect(secondService.selectedThemeId, equals('lebaran'));
      expect(secondService.effectiveThemeId, equals('lebaran'));
    },
  );

  test(
    'uses default dark tokens when selected theme has no valid dark tokens',
    () async {
      final service = LoginThemeCampaignService.test(
        fetcher: () async => _validPayload(includeDarkTokens: false),
      );
      await service.initialize();
      await service.refresh(force: true);

      expect(service.effectiveThemeId, equals('lebaran'));
      final darkTokens = service.resolveTokens(brightness: Brightness.dark);
      expect(darkTokens.textPrimary, equals(const Color(0xFFFFFFFF)));
    },
  );

  test('parses backend runtime payload and exposes runtime metadata', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(),
    );

    await service.initialize();
    await service.refresh(force: true);

    expect(service.effectiveThemeId, equals('theme-ramadan'));
    expect(service.effectiveThemeLabel, equals('Ramadan Core'));
    expect(service.runtimeMetadata.source, equals('ACTIVE_CAMPAIGN'));
    expect(service.runtimeMetadata.killSwitchEnabled, isFalse);
    expect(service.runtimeMetadata.campaignId, equals('cmp-ramadan-1'));
  });

  test('keeps runtime parsing safe when kill switch is enabled', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(
        source: 'KILL_SWITCH_BASE',
        killSwitchEnabled: true,
        campaignId: null,
        campaignName: null,
      ),
    );

    await service.initialize();
    await service.refresh(force: true);

    expect(service.effectiveThemeId, equals('theme-ramadan'));
    expect(service.runtimeMetadata.source, equals('KILL_SWITCH_BASE'));
    expect(service.runtimeMetadata.killSwitchEnabled, isTrue);
    expect(service.runtimeMetadata.campaignId, isNull);
  });

  test('parses runtime mobile assets and normalizes relative URLs', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(
        assetManifestJson: {
          'mobile': {
            'backgroundImage':
                '/uploads/theme-assets/ramadan-core/mobile-background.svg',
            'illustration': 'uploads/theme-assets/ramadan-core/mobile-illustration.svg',
            'iconPack': 'rounded-enterprise',
            'accentAsset': 'diamond-grid',
          },
        },
      ),
    );

    await service.initialize();
    await service.refresh(force: true);

    final assets = service.effectiveAssets;
    expect(
      assets.backgroundImage,
      equals(
        'http://localhost:8080/uploads/theme-assets/ramadan-core/mobile-background.svg',
      ),
    );
    expect(
      assets.illustration,
      equals(
        'http://localhost:8080/uploads/theme-assets/ramadan-core/mobile-illustration.svg',
      ),
    );
    expect(assets.iconPack, equals('rounded-enterprise'));
    expect(assets.accentAsset, equals('diamond-grid'));
  });

  test('falls back to web assets when mobile assets are empty', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(
        assetManifestJson: {
          'mobile': {'backgroundImage': '', 'illustration': ''},
          'web': {
            'backgroundImage': '/uploads/theme-assets/harvest-week/web-background.svg',
            'illustration': '/uploads/theme-assets/harvest-week/web-illustration.svg',
            'iconPack': 'glyph-ops',
            'accentAsset': 'wave-bars',
          },
        },
      ),
    );

    await service.initialize();
    await service.refresh(force: true);

    final assets = service.effectiveAssets;
    expect(
      assets.backgroundImage,
      equals(
        'http://localhost:8080/uploads/theme-assets/harvest-week/web-background.svg',
      ),
    );
    expect(
      assets.illustration,
      equals(
        'http://localhost:8080/uploads/theme-assets/harvest-week/web-illustration.svg',
      ),
    );
    expect(assets.iconPack, equals('glyph-ops'));
    expect(assets.accentAsset, equals('wave-bars'));
  });

  test('uses root backgroundImage when mobile and web entries are empty', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(
        assetManifestJson: {
          'backgroundImage': '/uploads/theme-assets/ramadan-core/root-background.svg',
          'mobile': {'backgroundImage': ''},
          'web': {'backgroundImage': ''},
        },
      ),
    );

    await service.initialize();
    await service.refresh(force: true);

    final assets = service.effectiveAssets;
    expect(
      assets.backgroundImage,
      equals(
        'http://localhost:8080/uploads/theme-assets/ramadan-core/root-background.svg',
      ),
    );
  });

  test('keeps absolute non-theme asset URLs unchanged', () async {
    const externalUrl =
        'https://images.unsplash.com/photo-1519817650390-64a93db511aa?auto=format&fit=crop&w=1600&q=80';
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(
        assetManifestJson: {
          'mobile': {
            'backgroundImage': externalUrl,
          },
        },
      ),
    );

    await service.initialize();
    await service.refresh(force: true);

    final assets = service.effectiveAssets;
    expect(assets.backgroundImage, equals(externalUrl));
  });

  test('persists cached runtime assets across service instances', () async {
    final firstService = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(
        assetManifestJson: {
          'mobile': {
            'backgroundImage':
                '/uploads/theme-assets/ramadan-core/mobile-background.svg',
          },
        },
      ),
    );

    await firstService.initialize();
    await firstService.refresh(force: true);
    await _waitUntilIdle(firstService);

    final secondService = LoginThemeCampaignService.test(
      fetcher: () async => throw Exception('network unavailable'),
    );
    await secondService.initialize();

    expect(
      secondService.effectiveAssets.backgroundImage,
      equals(
        'http://localhost:8080/uploads/theme-assets/ramadan-core/mobile-background.svg',
      ),
    );
    expect(secondService.runtimeMetadata.source, equals('ACTIVE_CAMPAIGN'));
  });

  test('parses typed app_ui slots from runtime payload', () async {
    final service = LoginThemeCampaignService.test(
      fetcher: () async => _runtimePayload(
        appUi: {
          'navbar': {
            'backgroundColor': '#0F172A',
            'foregroundColor': '#FFFFFF',
          },
          'sidebar': {
            'backgroundColor': '#0B1220',
            'foregroundColor': '#E2E8F0',
            'iconColor': '#93C5FD',
            'borderColor': '#1E293B',
          },
          'footer': {
            'backgroundColor': '#111827',
            'foregroundColor': '#9CA3AF',
            'accentColor': '#34D399',
            'borderColor': '#1F2937',
          },
          'notification_banner': {
            'backgroundColor': '#1E3A8A',
            'textColor': '#FFFFFF',
          },
          'empty_state_illustration': {
            'asset': '/uploads/theme-assets/mobile/illustration/theme-empty.svg',
          },
        },
      ),
    );

    await service.initialize();
    await service.refresh(force: true);

    final appUi = service.effectiveAppUi;
    expect(appUi.navbar.backgroundColor, equals('#0F172A'));
    expect(appUi.navbar.foregroundColor, equals('#FFFFFF'));
    expect(appUi.sidebar.backgroundColor, equals('#0B1220'));
    expect(appUi.sidebar.foregroundColor, equals('#E2E8F0'));
    expect(appUi.sidebar.iconColor, equals('#93C5FD'));
    expect(appUi.sidebar.borderColor, equals('#1E293B'));
    expect(appUi.footer.backgroundColor, equals('#111827'));
    expect(appUi.footer.foregroundColor, equals('#9CA3AF'));
    expect(appUi.footer.accentColor, equals('#34D399'));
    expect(appUi.footer.borderColor, equals('#1F2937'));
    expect(appUi.notificationBanner.backgroundColor, equals('#1E3A8A'));
    expect(appUi.notificationBanner.textColor, equals('#FFFFFF'));
    expect(
      appUi.emptyStateIllustration.asset,
      equals(
        'http://localhost:8080/uploads/theme-assets/mobile/illustration/theme-empty.svg',
      ),
    );
  });

  test(
    'parses token_json from runtime modes and resolves light/dark tokens independently',
    () async {
      final service = LoginThemeCampaignService.test(
        fetcher: () async => {
          'source': 'ACTIVE_CAMPAIGN',
          'theme': {
            'id': 'theme-mode-aware',
            'modes': {
              'light': {
                'token_json': {
                  'accentColor': '#0EA5E9',
                  'accentSoftColor': '#BAE6FD',
                  'loginCardBorder': '#7DD3FC',
                },
              },
              'dark': {
                'token_json': {
                  'accentColor': '#22D3EE',
                  'accentSoftColor': '#155E75',
                  'loginCardBorder': '#0E7490',
                },
              },
            },
          },
        },
      );

      await service.initialize();
      await service.refresh(force: true);

      final lightTokens = service.resolveTokens(brightness: Brightness.light);
      final darkTokens = service.resolveTokens(brightness: Brightness.dark);

      expect(lightTokens.link, equals(const Color(0xFF0EA5E9)));
      expect(darkTokens.link, equals(const Color(0xFF22D3EE)));
      expect(lightTokens.link, isNot(equals(darkTokens.link)));
    },
  );

  test(
    'prefers active runtime mode variants for assets and app_ui, with fallback for missing fields',
    () async {
      await ThemeModeService.instance.setThemeMode(ThemeMode.dark);

      final service = LoginThemeCampaignService.test(
        fetcher: () async => {
          'source': 'ACTIVE_CAMPAIGN',
          'theme': {
            'id': 'theme-mode-assets',
            'modes': {
              'light': {
                'asset_manifest_json': {
                  'mobile': {
                    'illustration': '/uploads/theme-assets/light/illustration.svg',
                    'iconPack': 'light-pack',
                  },
                },
                'app_ui': {
                  'sidebar': {'backgroundColor': '#E2E8F0'},
                },
              },
              'dark': {
                'asset_manifest_json': {
                  'mobile': {
                    'backgroundImage':
                        '/uploads/theme-assets/dark/background.svg',
                    'accentAsset': 'dark-accent',
                  },
                },
                'app_ui': {
                  'navbar': {'backgroundColor': '#0B1120'},
                },
              },
            },
          },
        },
      );

      await service.initialize();
      await service.refresh(force: true);

      final assets = service.effectiveAssets;
      final appUi = service.effectiveAppUi;

      expect(
        assets.backgroundImage,
        equals('http://localhost:8080/uploads/theme-assets/dark/background.svg'),
      );
      expect(
        assets.illustration,
        equals('http://localhost:8080/uploads/theme-assets/light/illustration.svg'),
      );
      expect(assets.iconPack, equals('light-pack'));
      expect(assets.accentAsset, equals('dark-accent'));
      expect(appUi.navbar.backgroundColor, equals('#0B1120'));
      expect(appUi.sidebar.backgroundColor, equals('#E2E8F0'));
    },
  );

  test(
    'refreshIfStale returns immediately with stale cache and refreshes in background',
    () async {
      var now = DateTime.utc(2026, 3, 15, 8);
      var callCount = 0;
      final delayedFetch = Completer<Map<String, dynamic>>();
      final service = LoginThemeCampaignService.test(
        now: () => now,
        fetcher: () {
          callCount++;
          if (callCount == 1) {
            return Future.value(_validPayload());
          }
          return delayedFetch.future;
        },
      );

      await service.initialize();
      await service.refresh(force: true);
      await _waitUntilIdle(service);
      expect(service.effectiveThemeId, equals('lebaran'));

      now = now.add(const Duration(hours: 7));
      final stopwatch = Stopwatch()..start();
      await service.refreshIfStale();
      stopwatch.stop();

      expect(stopwatch.elapsedMilliseconds < 100, isTrue);
      expect(service.effectiveThemeId, equals('lebaran'));
      await Future<void>.delayed(Duration.zero);
      expect(service.isFetching, isTrue);

      delayedFetch.complete(_validPayload(activeThemeId: 'lebaran'));
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(service.isFetching, isFalse);
      expect(callCount, equals(2));
    },
  );

  test(
    'initialize backfills runtime background when cache is fresh but asset is empty',
    () async {
      final now = DateTime.utc(2026, 3, 15, 12, 30);
      SharedPreferences.setMockInitialValues({
        'login_theme_selection_mode': 'auto',
        'login_theme_payload_cache': jsonEncode(_validPayload()),
        'login_theme_payload_fetched_at':
            DateTime.utc(2026, 3, 15, 12).toIso8601String(),
      });
      final prefs = await SharedPreferences.getInstance();

      var callCount = 0;
      final service = LoginThemeCampaignService.test(
        now: () => now,
        prefs: prefs,
        fetcher: () async {
          callCount++;
          return _runtimePayload(
            assetManifestJson: {
              'mobile': {
                'backgroundImage':
                    '/uploads/theme-assets/refresh/mobile-background.svg',
              },
            },
          );
        },
      );

      await service.initialize();
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await _waitUntilIdle(service);

      expect(callCount, equals(1));
      expect(
        service.effectiveAssets.backgroundImage,
        equals(
          'http://localhost:8080/uploads/theme-assets/refresh/mobile-background.svg',
        ),
      );
    },
  );

  test(
    'exposes runtime diagnostics for source, cache age, and fetch errors',
    () async {
      var now = DateTime.utc(2026, 3, 15, 9);
      var shouldFail = false;

      final service = LoginThemeCampaignService.test(
        now: () => now,
        fetcher: () async {
          if (shouldFail) {
            throw Exception('network unavailable');
          }
          return _runtimePayload();
        },
      );

      await service.initialize();
      await service.refresh(force: true);
      await _waitUntilIdle(service);

      final initialDiagnostics = service.runtimeDiagnostics;
      expect(initialDiagnostics.source, equals('ACTIVE_CAMPAIGN'));
      expect(initialDiagnostics.isUsingFallback, isFalse);
      expect(initialDiagnostics.isCacheAvailable, isTrue);
      expect(initialDiagnostics.lastError, isNull);

      now = now.add(const Duration(hours: 8));
      shouldFail = true;
      await service.refresh(force: true);
      await _waitUntilIdle(service);

      final failedDiagnostics = service.runtimeDiagnostics;
      expect(failedDiagnostics.source, equals('ACTIVE_CAMPAIGN'));
      expect(failedDiagnostics.isStale, isTrue);
      expect(failedDiagnostics.lastError, contains('network unavailable'));
    },
  );
}

