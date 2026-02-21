// Gen Z Validation Tab - Organism Component
// QR Scanner and validation interface with enhanced UX
// Features: Flash Toggle, Recent Scan History, Loading Overlay, Haptic Feedback

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../molecules/genz_section_header.dart';
import 'genz_tab_container.dart';

/// Data model for recent scan history
class RecentScanData {
  final String vehiclePlate;
  final String driverName;
  final String action; // 'ENTRY' or 'EXIT'
  final DateTime timestamp;
  final bool isSuccess;

  const RecentScanData({
    required this.vehiclePlate,
    required this.driverName,
    required this.action,
    required this.timestamp,
    this.isSuccess = true,
  });
}

/// Complete Gen Z styled validation/QR scanner tab with enhanced features
class GenZValidationTab extends StatefulWidget {
  final VoidCallback? onScanQR;
  final VoidCallback? onManualEntry;
  final VoidCallback? onFlashToggle;
  final bool isScanning;
  final bool isFlashOn;
  final bool isProcessing;
  final Widget? scannerWidget;
  final List<RecentScanData> recentScans;

  const GenZValidationTab({
    Key? key,
    this.onScanQR,
    this.onManualEntry,
    this.onFlashToggle,
    this.isScanning = false,
    this.isFlashOn = false,
    this.isProcessing = false,
    this.scannerWidget,
    this.recentScans = const [],
  }) : super(key: key);

  @override
  State<GenZValidationTab> createState() => _GenZValidationTabState();
}

class _GenZValidationTabState extends State<GenZValidationTab>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  /// Trigger haptic feedback for scan events
  void _triggerHapticFeedback({bool isSuccess = true}) {
    if (isSuccess) {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.heavyImpact();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GenZScrollableTab(
      children: [
        GenZSectionHeader.blue(
          icon: Icons.qr_code_scanner_rounded,
          title: 'Validasi',
          subtitle: 'Scan QR atau input manual',
        ),
        const SizedBox(height: 24),
        _buildScannerArea(),
        const SizedBox(height: 16),
        _buildControlButtons(),
        const SizedBox(height: 24),
        _buildManualEntryButton(),
        if (widget.recentScans.isNotEmpty) ...[
          const SizedBox(height: 24),
          _buildRecentScansSection(),
        ],
      ],
    );
  }

  Widget _buildScannerArea() {
    return Stack(
      children: [
        Container(
          height: 320,
          decoration: BoxDecoration(
            color: const Color(0xFF1F2937),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: widget.isScanning 
                  ? const Color(0xFF3B82F6).withOpacity(0.5) 
                  : const Color(0xFF374151),
              width: widget.isScanning ? 2 : 1,
            ),
            boxShadow: widget.isScanning
                ? [
                    BoxShadow(
                      color: const Color(0xFF3B82F6).withOpacity(0.2),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
          ),
          child: Stack(
            children: [
              // Scanner Widget (if scanning)
              if (widget.isScanning && widget.scannerWidget != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: SizedBox.expand(child: widget.scannerWidget!),
                )
              else
                // Scanner placeholder with pulse animation
                Center(
                  child: GestureDetector(
                    onTap: () {
                      _triggerHapticFeedback();
                      widget.onScanQR?.call();
                    },
                    child: AnimatedBuilder(
                      animation: _pulseAnimation,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: widget.isScanning ? 1.0 : _pulseAnimation.value,
                          child: child,
                        );
                      },
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(28),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  const Color(0xFF8B5CF6).withOpacity(0.2),
                                  const Color(0xFF3B82F6).withOpacity(0.2),
                                ],
                              ),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: const Color(0xFF8B5CF6).withOpacity(0.3),
                                width: 2,
                              ),
                            ),
                            child: const Icon(
                              Icons.qr_code_scanner_rounded,
                              size: 72,
                              color: Color(0xFF8B5CF6),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Tap untuk scan QR',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF9CA3AF),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Arahkan kamera ke kode QR',
                            style: TextStyle(
                              fontSize: 12,
                              color: const Color(0xFF6B7280).withOpacity(0.8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              
              // Top buttons row (Flash + Close)
              if (widget.isScanning)
                Positioned(
                  top: 16,
                  left: 16,
                  right: 16,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Flash toggle button
                      _buildCircleButton(
                        icon: widget.isFlashOn 
                            ? Icons.flash_on_rounded 
                            : Icons.flash_off_rounded,
                        color: widget.isFlashOn 
                            ? const Color(0xFFFBBF24) 
                            : Colors.white,
                        backgroundColor: widget.isFlashOn
                            ? const Color(0xFFFBBF24).withOpacity(0.2)
                            : Colors.black.withOpacity(0.5),
                        onTap: () {
                          _triggerHapticFeedback();
                          widget.onFlashToggle?.call();
                        },
                      ),
                      // Close button
                      _buildCircleButton(
                        icon: Icons.close_rounded,
                        color: Colors.white,
                        backgroundColor: Colors.black.withOpacity(0.5),
                        onTap: () {
                          _triggerHapticFeedback();
                          widget.onScanQR?.call();
                        },
                      ),
                    ],
                  ),
                ),

              // Scanning indicator text
              if (widget.isScanning)
                Positioned(
                  bottom: 16,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                const Color(0xFF3B82F6).withOpacity(0.8),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'Memindai...',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Corner decorations
              ..._buildCornerDecorations(),
            ],
          ),
        ),

        // Loading overlay when processing
        if (widget.isProcessing)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1F2937),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF3B82F6).withOpacity(0.3),
                            blurRadius: 20,
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          const SizedBox(
                            width: 48,
                            height: 48,
                            child: CircularProgressIndicator(
                              strokeWidth: 3,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Color(0xFF3B82F6),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Memproses QR Code...',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Mohon tunggu sebentar',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.6),
                              fontSize: 12,
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
      ],
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required Color color,
    required Color backgroundColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: backgroundColor,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 24),
        ),
      ),
    );
  }

  Widget _buildControlButtons() {
    return Row(
      children: [
        Expanded(
          child: _buildQuickActionButton(
            icon: Icons.flash_on_rounded,
            label: widget.isFlashOn ? 'Flash On' : 'Flash Off',
            isActive: widget.isFlashOn,
            onTap: () {
              _triggerHapticFeedback();
              widget.onFlashToggle?.call();
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildQuickActionButton(
            icon: Icons.qr_code_scanner_rounded,
            label: widget.isScanning ? 'Stop Scan' : 'Start Scan',
            isActive: widget.isScanning,
            isPrimary: true,
            onTap: () {
              _triggerHapticFeedback();
              widget.onScanQR?.call();
            },
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isActive = false,
    bool isPrimary = false,
  }) {
    final activeColor = isPrimary 
        ? const Color(0xFF3B82F6) 
        : const Color(0xFFFBBF24);
    
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            color: isActive 
                ? activeColor.withOpacity(0.15) 
                : const Color(0xFF1F2937),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isActive ? activeColor : const Color(0xFF374151),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isActive ? activeColor : const Color(0xFF9CA3AF),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: isActive ? activeColor : const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCornerDecorations() {
    const cornerSize = 24.0;
    const borderWidth = 3.0;
    final color = widget.isScanning 
        ? const Color(0xFF3B82F6) 
        : const Color(0xFF8B5CF6);

    return [
      // Top Left
      Positioned(
        top: 12,
        left: 12,
        child: _buildCorner(color, cornerSize, borderWidth, true, true),
      ),
      // Top Right
      Positioned(
        top: 12,
        right: 12,
        child: _buildCorner(color, cornerSize, borderWidth, true, false),
      ),
      // Bottom Left
      Positioned(
        bottom: 12,
        left: 12,
        child: _buildCorner(color, cornerSize, borderWidth, false, true),
      ),
      // Bottom Right
      Positioned(
        bottom: 12,
        right: 12,
        child: _buildCorner(color, cornerSize, borderWidth, false, false),
      ),
    ];
  }

  Widget _buildCorner(Color color, double size, double width, bool isTop, bool isLeft) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _CornerPainter(
          color: color,
          strokeWidth: width,
          isTop: isTop,
          isLeft: isLeft,
        ),
      ),
    );
  }

  Widget _buildManualEntryButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          _triggerHapticFeedback();
          widget.onManualEntry?.call();
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1F2937),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF374151)),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.keyboard_rounded, color: Color(0xFF9CA3AF), size: 20),
              SizedBox(width: 12),
              Text(
                'Input Manual Plat Kendaraan',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentScansSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Scan Terakhir',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            Text(
              '${widget.recentScans.length} item',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withOpacity(0.5),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...widget.recentScans.take(3).map(_buildRecentScanItem),
      ],
    );
  }

  Widget _buildRecentScanItem(RecentScanData scan) {
    final isEntry = scan.action.toUpperCase() == 'ENTRY';
    final actionColor = isEntry 
        ? const Color(0xFF10B981) 
        : const Color(0xFFF59E0B);
    final actionIcon = isEntry 
        ? Icons.login_rounded 
        : Icons.logout_rounded;
    final actionText = isEntry ? 'MASUK' : 'KELUAR';

    final timeAgo = _formatTimeAgo(scan.timestamp);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: scan.isSuccess 
              ? const Color(0xFF374151) 
              : const Color(0xFFEF4444).withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          // Action icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: actionColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(actionIcon, color: actionColor, size: 20),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  scan.vehiclePlate,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  scan.driverName,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
          // Status & time
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: actionColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  actionText,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: actionColor,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                timeAgo,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.white.withOpacity(0.4),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTimeAgo(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Baru saja';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} menit lalu';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} jam lalu';
    } else {
      return '${difference.inDays} hari lalu';
    }
  }
}

/// Custom painter for corner brackets
class _CornerPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final bool isTop;
  final bool isLeft;

  _CornerPainter({
    required this.color,
    required this.strokeWidth,
    required this.isTop,
    required this.isLeft,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    
    if (isTop && isLeft) {
      path.moveTo(0, size.height);
      path.lineTo(0, 0);
      path.lineTo(size.width, 0);
    } else if (isTop && !isLeft) {
      path.moveTo(0, 0);
      path.lineTo(size.width, 0);
      path.lineTo(size.width, size.height);
    } else if (!isTop && isLeft) {
      path.moveTo(0, 0);
      path.lineTo(0, size.height);
      path.lineTo(size.width, size.height);
    } else {
      path.moveTo(0, size.height);
      path.lineTo(size.width, size.height);
      path.lineTo(size.width, 0);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
