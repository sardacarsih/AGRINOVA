import 'package:agrinova_mobile/core/theme/login_theme_campaign_service.dart';
import 'package:agrinova_mobile/features/auth/presentation/pages/splash_screen.dart';
import 'package:agrinova_mobile/shared/widgets/intro_animation/agrinova_intro_animation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Splash screen forwards campaign palette into intro animation', (
    tester,
  ) async {
    final expectedTokens = LoginThemeCampaignService.instance.resolveTokens(
      brightness: Brightness.light,
    );

    await tester.pumpWidget(
      const MaterialApp(home: SplashScreen(isInitialized: false)),
    );

    final intro = tester.widget<AgrinovaIntroAnimation>(
      find.byType(AgrinovaIntroAnimation),
    );
    expect(intro.palette, isNotNull);
    expect(
      intro.palette!.backgroundColor,
      equals(expectedTokens.bgGradient.first),
    );
    expect(
      intro.palette!.accentPrimary,
      equals(expectedTokens.buttonGradient.first),
    );
  });
}
