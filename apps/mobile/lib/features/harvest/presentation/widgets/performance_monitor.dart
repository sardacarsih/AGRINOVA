import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:stop_watch_timer/stop_watch_timer.dart';
import '../../../../core/services/database_service.dart';

class PerformanceMonitor extends StatefulWidget {
  final Widget child;
  final bool enabled;
  final VoidCallback? onPerformanceWarning;

  const PerformanceMonitor({
    super.key,
    required this.child,
    this.enabled = true,
    this.onPerformanceWarning,
  });

  @override
  State<PerformanceMonitor> createState() => _PerformanceMonitorState();
}

class _PerformanceMonitorState extends State<PerformanceMonitor> {
  final StopWatchTimer _renderTimer = StopWatchTimer();
  final List<RenderMetric> _renderMetrics = [];
  Timer? _performanceCheckTimer;
  int _lastFrameTime = 0;
  int _frameCount = 0;
  bool _showOverlay = false;

  @override
  void initState() {
    super.initState();
    if (widget.enabled) {
      _startPerformanceMonitoring();
    }
  }

  @override
  void dispose() {
    _renderTimer.dispose();
    _performanceCheckTimer?.cancel();
    super.dispose();
  }

  void _startPerformanceMonitoring() {
    _renderTimer.onStart();
    WidgetsBinding.instance.addPostFrameCallback(_onFrameRendered);

    // Check performance every 5 seconds
    _performanceCheckTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _checkPerformance();
    });
  }

  void _onFrameRendered(Duration timestamp) {
    if (!widget.enabled) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    if (_lastFrameTime > 0) {
      final frameTime = now - _lastFrameTime;
      _frameCount++;

      if (_frameCount % 60 == 0) { // Every 60 frames
        _addRenderMetric(frameTime);
      }
    }
    _lastFrameTime = now;

    WidgetsBinding.instance.addPostFrameCallback(_onFrameRendered);
  }

  void _addRenderMetric(int frameTime) {
    final metric = RenderMetric(
      timestamp: DateTime.now(),
      frameTimeMs: frameTime,
      fps: (1000 / frameTime).round(),
    );

    setState(() {
      _renderMetrics.add(metric);
      if (_renderMetrics.length > 100) {
        _renderMetrics.removeAt(0);
      }
    });

    // Check for performance issues
    if (frameTime > 33) { // Less than 30 FPS
      widget.onPerformanceWarning?.call();
    }
  }

  void _checkPerformance() {
    if (_renderMetrics.length < 10) return;

    final recentMetrics = _renderMetrics.sublist(_renderMetrics.length - 10);
    final avgFrameTime = recentMetrics
        .map((m) => m.frameTimeMs)
        .reduce((a, b) => a + b) / recentMetrics.length;

    if (avgFrameTime > 33) {
      debugPrint('⚠️ Performance Warning: Average frame time ${avgFrameTime.toStringAsFixed(2)}ms');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (widget.enabled && _showOverlay)
          Positioned(
            top: 50,
            right: 10,
            child: _buildPerformanceOverlay(),
          ),
        if (widget.enabled)
          Positioned(
            top: 50,
            left: 10,
            child: _buildPerformanceToggle(),
          ),
      ],
    );
  }

  Widget _buildPerformanceToggle() {
    return GestureDetector(
      onTap: () => setState(() => _showOverlay = !_showOverlay),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.7),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.speed,
              size: 16,
              color: _getPerformanceColor(),
            ),
            const SizedBox(width: 4),
            Text(
              '${_getCurrentFps()} FPS',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPerformanceOverlay() {
    return Container(
      width: 250,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.8),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Performance Monitor',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          _buildMetricRow('FPS', '${_getCurrentFps()}', _getPerformanceColor()),
          _buildMetricRow('Frame Time', '${_getCurrentFrameTime()}ms', Colors.white),
          _buildMetricRow('Memory', '${_getCurrentMemoryUsage()}MB', Colors.white),
          _buildMetricRow('Network', _getNetworkStatus(), _getNetworkColor()),
          const SizedBox(height: 8),
          if (_renderMetrics.isNotEmpty)
            Container(
              height: 50,
              child: _buildFpsChart(),
            ),
        ],
      ),
    );
  }

  Widget _buildMetricRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 12,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFpsChart() {
    return CustomPaint(
      size: const Size(200, 50),
      painter: FpsChartPainter(_renderMetrics),
    );
  }

  int _getCurrentFps() {
    if (_renderMetrics.isEmpty) return 60;
    return _renderMetrics.last.fps;
  }

  int _getCurrentFrameTime() {
    if (_renderMetrics.isEmpty) return 16;
    return _renderMetrics.last.frameTimeMs.round();
  }

  int _getCurrentMemoryUsage() {
    // Simulate memory usage (in real app, use dart:developer or similar)
    return 80 + (_renderMetrics.length % 40);
  }

  String _getNetworkStatus() {
    return 'Connected'; // In real app, check actual network status
  }

  Color _getPerformanceColor() {
    final fps = _getCurrentFps();
    if (fps >= 55) return Colors.green;
    if (fps >= 30) return Colors.yellow;
    return Colors.red;
  }

  Color _getNetworkColor() {
    return Colors.green; // In real app, based on actual network quality
  }
}

class RenderMetric {
  final DateTime timestamp;
  final double frameTimeMs;
  final int fps;

  RenderMetric({
    required this.timestamp,
    required this.frameTimeMs,
    required this.fps,
  });
}

class FpsChartPainter extends CustomPainter {
  final List<RenderMetric> metrics;

  FpsChartPainter(this.metrics);

  @override
  void paint(Canvas canvas, Size size) {
    if (metrics.isEmpty) return;

    final paint = Paint()
      ..color = Colors.green
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final path = Path();
    final width = size.width;
    final height = size.height;

    for (int i = 0; i < metrics.length; i++) {
      final metric = metrics[i];
      final x = (i / (metrics.length - 1)) * width;
      final y = height - (metric.fps / 60) * height;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);

    // Draw 60 FPS baseline
    final baselinePaint = Paint()
      ..color = Colors.white.withOpacity(0.3)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    canvas.drawLine(
      Offset(0, height - height),
      Offset(width, height - height),
      baselinePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return true;
  }
}

// Form Performance Monitor for Harvest Input
class FormPerformanceMonitor extends StatefulWidget {
  final Widget child;
  final String formName;

  const FormPerformanceMonitor({
    super.key,
    required this.child,
    required this.formName,
  });

  @override
  State<FormPerformanceMonitor> createState() => _FormPerformanceMonitorState();
}

class _FormPerformanceMonitorState extends State<FormPerformanceMonitor> {
  final Stopwatch _stopwatch = Stopwatch();
  final List<FormInteractionMetric> _metrics = [];
  DateTime? _fieldFocusStart;
  String? _currentField;

  @override
  Widget build(BuildContext context) {
    return NotificationListener<FormInteractionNotification>(
      onNotification: (notification) {
        _handleFormInteraction(notification);
        return true;
      },
      child: widget.child,
    );
  }

  void _handleFormInteraction(FormInteractionNotification notification) {
    switch (notification.type) {
      case FormInteractionType.fieldFocus:
        _fieldFocusStart = DateTime.now();
        _currentField = notification.fieldName;
        break;
      case FormInteractionType.fieldBlur:
        if (_fieldFocusStart != null && _currentField != null) {
          final duration = DateTime.now().difference(_fieldFocusStart!);
          _metrics.add(FormInteractionMetric(
            fieldName: _currentField!,
            interactionType: 'field_focus_duration',
            durationMs: duration.inMilliseconds,
            timestamp: DateTime.now(),
          ));
        }
        break;
      case FormInteractionType.validationStart:
        _stopwatch.start();
        break;
      case FormInteractionType.validationEnd:
        _stopwatch.stop();
        _metrics.add(FormInteractionMetric(
          fieldName: 'form_validation',
          interactionType: 'validation',
          durationMs: _stopwatch.elapsedMilliseconds,
          timestamp: DateTime.now(),
        ));
        _stopwatch.reset();
        break;
      case FormInteractionType.submitStart:
        _stopwatch.start();
        break;
      case FormInteractionType.submitEnd:
        _stopwatch.stop();
        _metrics.add(FormInteractionMetric(
          fieldName: 'form_submit',
          interactionType: 'submit',
          durationMs: _stopwatch.elapsedMilliseconds,
          timestamp: DateTime.now(),
        ));
        _stopwatch.reset();
        _logFormPerformance();
        break;
    }
  }

  void _logFormPerformance() {
    debugPrint('=== ${widget.formName} Performance Report ===');
    for (final metric in _metrics) {
      debugPrint('${metric.interactionType}: ${metric.durationMs}ms');
    }
    debugPrint('=== End Report ===');
  }
}

class FormInteractionMetric {
  final String fieldName;
  final String interactionType;
  final int durationMs;
  final DateTime timestamp;

  FormInteractionMetric({
    required this.fieldName,
    required this.interactionType,
    required this.durationMs,
    required this.timestamp,
  });
}

class FormInteractionNotification extends Notification {
  final FormInteractionType type;
  final String? fieldName;

  FormInteractionNotification({
    required this.type,
    this.fieldName,
  });
}

enum FormInteractionType {
  fieldFocus,
  fieldBlur,
  validationStart,
  validationEnd,
  submitStart,
  submitEnd,
}

// Extension to easily add form performance monitoring
extension FormPerformanceExtension on Widget {
  Widget withFormPerformanceMonitoring(String formName) {
    return FormPerformanceMonitor(
      formName: formName,
      child: this,
    );
  }
}

// Performance-aware TextField
class PerformanceTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final String? labelText;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? fieldName;

  const PerformanceTextField({
    super.key,
    this.controller,
    this.validator,
    this.onChanged,
    this.labelText,
    this.keyboardType,
    this.obscureText = false,
    this.fieldName,
  });

  @override
  State<PerformanceTextField> createState() => _PerformanceTextFieldState();
}

class _PerformanceTextFieldState extends State<PerformanceTextField> {
  final FocusNode _focusNode = FocusNode();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _focusNode.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus) {
      FormInteractionNotification(
        type: FormInteractionType.fieldFocus,
        fieldName: widget.fieldName ?? widget.labelText,
      ).dispatch(context);
    } else {
      FormInteractionNotification(
        type: FormInteractionType.fieldBlur,
        fieldName: widget.fieldName ?? widget.labelText,
      ).dispatch(context);
    }
  }

  void _onChanged(String value) {
    // Debounce rapid changes
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      widget.onChanged?.call(value);
    });
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      validator: widget.validator,
      onChanged: _onChanged,
      focusNode: _focusNode,
      decoration: InputDecoration(
        labelText: widget.labelText,
        border: const OutlineInputBorder(),
      ),
      keyboardType: widget.keyboardType,
      obscureText: widget.obscureText,
    );
  }
}