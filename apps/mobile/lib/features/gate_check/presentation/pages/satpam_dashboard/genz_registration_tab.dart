import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../data/models/gate_check_models.dart';
import '../../widgets/guest_registration_form.dart';

/// Gen Z Styled Registration Tab with Futuristic Dark Theme
/// 
/// Features:
/// - Neon glow effects (purple, green, red)
/// - Glassmorphism with blurred backgrounds
/// - Dark futuristic gradient background
/// - Smooth rounded corners (20-32px)
/// - Minimalistic, clean typography
/// - Light reflections and soft shadows
class GenZRegistrationTab extends StatefulWidget {
  final Function(String) onVehiclePlateChanged;
  final Function(GateCheckFormData)? onFormDataChanged;
  final Function(String type) onCameraPressed;
  final VoidCallback onQRGeneratePressed;
  final bool isLoading;
  final bool isLoadingAction;
  final String? errorMessage;
  final GateCheckFormData initialData;
  final String generationIntent;
  final Function(String) onIntentChanged;
  final bool isRegistered;
  final VoidCallback? onRegisterNewPressed;

  const GenZRegistrationTab({
    super.key,
    required this.onVehiclePlateChanged,
    this.onFormDataChanged,
    required this.onCameraPressed,
    required this.onQRGeneratePressed,
    required this.isLoading,
    this.isLoadingAction = false,
    this.errorMessage,
    required this.initialData,
    required this.generationIntent,
    required this.onIntentChanged,
    this.isRegistered = false,
    this.onRegisterNewPressed,
  });

  @override
  State<GenZRegistrationTab> createState() => _GenZRegistrationTabState();
}

class _GenZRegistrationTabState extends State<GenZRegistrationTab> with AutomaticKeepAliveClientMixin {
  // Neon colors
  static const Color neonPurple = Color(0xFF8B5CF6);
  static const Color neonGreen = Color(0xFF10B981);
  static const Color neonRed = Color(0xFFEF4444);
  static const Color darkBg = Color(0xFF111827);
  static const Color darkCard = Color(0xFF1F2937);

  // Helper for opacity colors
  static Color _withAlpha(Color color, double opacity) {
    return color.withValues(alpha: opacity);
  }

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [darkBg, Color(0xFF0F172A)],
        ),
      ),
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Prominent Header - Pendaftaran Tamu at TOP
            _buildFuturisticHeader(),
            const SizedBox(height: 28),
            
            // Intent Toggle with neon styling
            _buildNeonEntryExitToggle(),
            const SizedBox(height: 24),
            
            // Guest Registration Form with glassmorphism
            _buildGlassFormContainer(context),
          ],
        ),
      ),
    );
  }

  /// Futuristic header with neon glow - Pendaftaran Tamu at TOP
  Widget _buildFuturisticHeader() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          // Purple neon glow
          BoxShadow(
            color: _withAlpha(neonPurple, 0.4),
            blurRadius: 30,
            spreadRadius: -5,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _withAlpha(const Color(0xFF7C3AED), 0.9),
                  _withAlpha(const Color(0xFF6D28D9), 0.85),
                  _withAlpha(const Color(0xFF5B21B6), 0.8),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: _withAlpha(Colors.white, 0.2),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                // Icon with glassmorphism container
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: _withAlpha(Colors.white, 0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _withAlpha(Colors.white, 0.3),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: _withAlpha(neonPurple, 0.5),
                        blurRadius: 15,
                        spreadRadius: -5,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.person_add_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                // Text content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pendaftaran Tamu',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 0.3,
                          shadows: [
                            Shadow(
                              color: _withAlpha(Colors.white, 0.3),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Daftarkan tamu dan kendaraan baru',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: _withAlpha(Colors.white, 0.85),
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Neon-styled entry/exit toggle
  Widget _buildNeonEntryExitToggle() {
    final isEntry = widget.generationIntent == 'ENTRY';
    
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _withAlpha(isEntry ? neonGreen : neonRed, 0.2),
            blurRadius: 20,
            spreadRadius: -5,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: _withAlpha(darkCard, 0.9),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _withAlpha(Colors.white, 0.1),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                // Entry option
                Expanded(
                  child: _buildToggleOption(
                    label: 'ENTRY',
                    subtitle: 'Masuk',
                    icon: Icons.arrow_upward_rounded,
                    isSelected: isEntry,
                    accentColor: neonGreen,
                    onTap: () => widget.onIntentChanged('ENTRY'),
                  ),
                ),
                const SizedBox(width: 8),
                // Exit option
                Expanded(
                  child: _buildToggleOption(
                    label: 'EXIT',
                    subtitle: 'Keluar',
                    icon: Icons.arrow_downward_rounded,
                    isSelected: !isEntry,
                    accentColor: neonRed,
                    onTap: () => widget.onIntentChanged('EXIT'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildToggleOption({
    required String label,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    _withAlpha(accentColor, 0.25),
                    _withAlpha(accentColor, 0.1),
                  ],
                )
              : null,
          color: isSelected ? null : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? _withAlpha(accentColor, 0.5) : Colors.transparent,
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: _withAlpha(accentColor, 0.3),
                    blurRadius: 15,
                    spreadRadius: -5,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected
                    ? _withAlpha(accentColor, 0.2)
                    : _withAlpha(Colors.white, 0.05),
                borderRadius: BorderRadius.circular(12),
                border: isSelected
                    ? Border.all(color: _withAlpha(accentColor, 0.4))
                    : null,
              ),
              child: Icon(
                icon,
                color: isSelected ? accentColor : _withAlpha(Colors.white, 0.5),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? accentColor : _withAlpha(Colors.white, 0.6),
                      letterSpacing: 1,
                      shadows: isSelected
                          ? [
                              Shadow(
                                color: _withAlpha(accentColor, 0.5),
                                blurRadius: 8,
                              ),
                            ]
                          : null,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: isSelected
                          ? _withAlpha(Colors.white, 0.7)
                          : _withAlpha(Colors.white, 0.4),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Glassmorphism container for the form
  Widget _buildGlassFormContainer(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _withAlpha(neonPurple, 0.15),
            blurRadius: 25,
            spreadRadius: -8,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _withAlpha(darkCard, 0.95),
                  _withAlpha(const Color(0xFF374151), 0.85),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: _withAlpha(Colors.white, 0.08),
                width: 1,
              ),
            ),
            child: Theme(
              // Apply dark theme to all form elements
              data: ThemeData.dark().copyWith(
                colorScheme: const ColorScheme.dark(
                  primary: neonPurple,
                  secondary: neonGreen,
                  surface: darkCard,
                ),
                inputDecorationTheme: InputDecorationTheme(
                  filled: true,
                  fillColor: _withAlpha(const Color(0xFF374151), 0.6),
                  labelStyle: TextStyle(
                    color: _withAlpha(Colors.white, 0.7),
                    fontWeight: FontWeight.w500,
                  ),
                  hintStyle: TextStyle(
                    color: _withAlpha(Colors.white, 0.4),
                  ),
                  prefixIconColor: neonPurple,
                  suffixIconColor: _withAlpha(neonPurple, 0.7),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(
                      color: _withAlpha(Colors.white, 0.1),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(
                      color: _withAlpha(Colors.white, 0.1),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(
                      color: neonPurple,
                      width: 2,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(
                      color: neonRed,
                      width: 1.5,
                    ),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(
                      color: neonRed,
                      width: 2,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 16,
                  ),
                ),
                elevatedButtonTheme: ElevatedButtonThemeData(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: neonPurple,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 16,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ).copyWith(
                    backgroundColor: WidgetStateProperty.resolveWith((states) {
                      if (states.contains(WidgetState.disabled)) {
                        return _withAlpha(neonPurple, 0.3);
                      }
                      if (states.contains(WidgetState.pressed)) {
                        return _withAlpha(neonPurple, 0.8);
                      }
                      return neonPurple;
                    }),
                  ),
                ),
                dropdownMenuTheme: DropdownMenuThemeData(
                  inputDecorationTheme: InputDecorationTheme(
                    filled: true,
                    fillColor: _withAlpha(const Color(0xFF374151), 0.6),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(
                        color: _withAlpha(Colors.white, 0.1),
                      ),
                    ),
                  ),
                ),
              ),
              child: _buildStyledForm(),
            ),
          ),
        ),
      ),
    );
  }

  /// Styled form without duplicate header (header is at top)
  Widget _buildStyledForm() {
    return _FuturisticGuestForm(
      onVehiclePlateChanged: widget.onVehiclePlateChanged,
      onFormDataChanged: widget.onFormDataChanged,
      onCameraPressed: widget.onCameraPressed,
      onQRGeneratePressed: widget.onQRGeneratePressed,
      isLoading: widget.isLoading,
      isLoadingAction: widget.isLoadingAction,
      errorMessage: widget.errorMessage,
      initialData: widget.initialData,
      isRegistered: widget.isRegistered,
      onRegisterNewPressed: widget.onRegisterNewPressed,
    );
  }
}

/// Custom styled guest form that removes the duplicate header
class _FuturisticGuestForm extends StatelessWidget {
  final Function(String)? onVehiclePlateChanged;
  final Function(GateCheckFormData)? onFormDataChanged;
  final Function(String type)? onCameraPressed;
  final VoidCallback? onQRGeneratePressed;
  final bool isLoading;
  final bool isLoadingAction;
  final String? errorMessage;
  final GateCheckFormData? initialData;
  final bool isRegistered;
  final VoidCallback? onRegisterNewPressed;

  const _FuturisticGuestForm({
    this.onVehiclePlateChanged,
    this.onFormDataChanged,
    this.onCameraPressed,
    this.onQRGeneratePressed,
    this.isLoading = false,
    this.isLoadingAction = false,
    this.errorMessage,
    this.initialData,
    this.isRegistered = false,
    this.onRegisterNewPressed,
  });

  @override
  Widget build(BuildContext context) {
    // Use the existing GuestRegistrationForm with header hidden
    // since the header is already displayed at the top of the tab
    return GuestRegistrationForm(
      onVehiclePlateChanged: onVehiclePlateChanged,
      onFormDataChanged: onFormDataChanged,
      onCameraPressed: onCameraPressed,
      onQRGeneratePressed: onQRGeneratePressed,
      isLoading: isLoading,
      isLoadingAction: isLoadingAction,
      errorMessage: errorMessage,
      initialData: initialData,
      showHeader: false, // Header is shown at top of tab
      isRegistered: isRegistered,
      onRegisterNewPressed: onRegisterNewPressed,
    );
  }
}
