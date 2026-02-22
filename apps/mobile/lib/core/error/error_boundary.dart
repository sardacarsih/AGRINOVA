import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../error/error_handler.dart';
import '../error/app_error.dart';
import 'widgets/error_display_widget.dart';
import 'widgets/graceful_degradation_widget.dart';

/// Error Boundary widget to catch and handle errors gracefully
class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function(AppError error, VoidCallback retry)? errorBuilder;
  final String? fallbackRoute;
  final bool enableRetry;
  final bool enableLogging;
  final Map<String, dynamic>? errorContext;

  const ErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
    this.fallbackRoute,
    this.enableRetry = true,
    this.enableLogging = true,
    this.errorContext,
  });

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  AppError? _error;
  bool _hasError = false;

  late _ErrorListener _errorListener;

  @override
  void initState() {
    super.initState();
    _errorListener = _ErrorListener(_handleError);
    _setupErrorListeners();
  }

  void _setupErrorListeners() {
    // Listen to global error events
    ErrorHandler().addListener(_errorListener);
  }

  @override
  void dispose() {
    ErrorHandler().removeListener(_errorListener);
    super.dispose();
  }

  void _handleError(AppError error) {
    if (mounted) {
      setState(() {
        _error = error;
        _hasError = true;
      });
    }
  }

  void _retry() {
    setState(() {
      _error = null;
      _hasError = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError && _error != null) {
      return widget.errorBuilder?.call(_error!, _retry) ??
          _buildDefaultErrorWidget(_error!);
    }

    return widget.child;
  }

  Widget _buildDefaultErrorWidget(AppError error) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Terjadi Kesalahan'),
        backgroundColor: Colors.red.shade50,
        foregroundColor: Colors.red.shade700,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _handleClose(),
        ),
      ),
      body: ErrorDisplayWidget(
        error: error,
        onRetry: widget.enableRetry ? _retry : null,
        onReportError: _reportError,
        onGoHome: _goToHome,
        errorContext: widget.errorContext,
      ),
    );
  }

  void _handleClose() {
    if (widget.fallbackRoute != null) {
      Navigator.of(context).pushNamedAndRemoveUntil(
        widget.fallbackRoute!,
        (route) => false,
      );
    } else {
      _goToHome();
    }
  }

  void _reportError() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ErrorReportingScreen(
          error: _error!,
          errorContext: widget.errorContext,
        ),
      ),
    );
  }

  void _goToHome() {
    Navigator.of(context).pushNamedAndRemoveUntil(
      '/',
      (route) => false,
    );
  }


}

/// BLoC Error Boundary for handling BLoC-specific errors
class BlocErrorBoundary<B extends BlocBase<dynamic>> extends StatelessWidget {
  final Widget child;
  final Widget Function(AppError error, VoidCallback retry)? errorBuilder;
  final B? bloc;
  final bool enableRetry;

  const BlocErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
    this.bloc,
    this.enableRetry = true,
  });

  @override
  Widget build(BuildContext context) {
    if (bloc != null) {
      return BlocProvider<B>.value(
        value: bloc!,
        child: _buildBlocListener(),
      );
    }
    return _buildBlocListener();
  }

  Widget _buildBlocListener() {
    return BlocListener<B, dynamic>(
      listener: (context, state) {
        // Handle BLoC errors
        if (state is BlocError) {
          _handleBlocError(context, state.error);
        }
      },
      child: child,
    );
  }

  void _handleBlocError(BuildContext context, AppError error) {
    final errorResult = ErrorHandler().handleError(error);
    final shouldRetry = enableRetry && ErrorHandler().isRecoverable(error);

    if (shouldRetry) {
      _showRetryDialog(context, error, errorResult);
    } else {
      _showErrorDialog(context, error, errorResult);
    }
  }

  void _showRetryDialog(BuildContext context, AppError error, dynamic errorResult) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Kesalahan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.error_outline,
              color: Colors.orange,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(errorResult.userMessage),
            if (errorResult.technicalMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                errorResult.technicalMessage!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (enableRetry)
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                // Retry logic would be handled by the specific BLoC
              },
              child: const Text('Coba Lagi'),
            ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(BuildContext context, AppError error, dynamic errorResult) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Kesalahan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.error,
              color: Colors.red,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(errorResult.userMessage),
            if (errorResult.technicalMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                errorResult.technicalMessage!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey.shade600,
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              ErrorHandler().getRecoverySuggestion(error) ?? '',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.blue.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

/// Async Error Boundary for handling async operations
class AsyncErrorBoundary<T> extends StatefulWidget {
  final Future<T> Function() future;
  final Widget Function(T data) builder;
  final Widget Function(AppError error, VoidCallback retry)? errorBuilder;
  final Widget Function()? loadingBuilder;
  final bool enableRetry;
  final Map<String, dynamic>? errorContext;

  const AsyncErrorBoundary({
    super.key,
    required this.future,
    required this.builder,
    this.errorBuilder,
    this.loadingBuilder,
    this.enableRetry = true,
    this.errorContext,
  });

  @override
  State<AsyncErrorBoundary<T>> createState() => _AsyncErrorBoundaryState<T>();
}

class _AsyncErrorBoundaryState<T> extends State<AsyncErrorBoundary<T>> {
  Future<T>? _future;
  T? _data;
  AppError? _error;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _executeFuture();
  }

  Future<void> _executeFuture() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      _future = widget.future();
      _data = await _future!;
    } catch (error, stackTrace) {
      _error = ErrorHandler().handleError(error, stackTrace: stackTrace);
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _retry() {
    _executeFuture();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return widget.loadingBuilder?.call() ??
          const Center(
            child: CircularProgressIndicator(),
          );
    }

    if (_error != null) {
      return widget.errorBuilder?.call(_error!, _retry) ??
          ErrorDisplayWidget(
            error: _error!,
            onRetry: widget.enableRetry ? _retry : null,
            errorContext: widget.errorContext,
          );
    }

    if (_data != null) {
      return widget.builder(_data as T);
    }

    return const SizedBox.shrink();
  }
}

/// Graceful degradation widget for when features are unavailable
class GracefulDegradationWrapper extends StatelessWidget {
  final Widget child;
  final Widget fallback;
  final bool isFeatureAvailable;
  final String? featureName;

  const GracefulDegradationWrapper({
    super.key,
    required this.child,
    required this.fallback,
    required this.isFeatureAvailable,
    this.featureName,
  });

  @override
  Widget build(BuildContext context) {
    if (isFeatureAvailable) {
      return child;
    }

    return GracefulDegradationWidget(
      featureName: featureName ?? 'Fitur',
      fallback: fallback,
    );
  }
}

/// Network-aware error boundary
class NetworkErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function()? onNetworkUnavailable;
  final bool enableRetry;
  final Duration retryDelay;

  const NetworkErrorBoundary({
    super.key,
    required this.child,
    this.onNetworkUnavailable,
    this.enableRetry = true,
    this.retryDelay = const Duration(seconds: 5),
  });

  @override
  State<NetworkErrorBoundary> createState() => _NetworkErrorBoundaryState();
}

class _NetworkErrorBoundaryState extends State<NetworkErrorBoundary> {
  bool _isNetworkAvailable = true;
  Timer? _retryTimer;

  @override
  void initState() {
    super.initState();
    _checkNetworkStatus();
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkNetworkStatus() async {
    try {
      // Simple connectivity check - replace with actual implementation
      final result = await InternetAddress.lookup('google.com');
      setState(() {
        _isNetworkAvailable = result.isNotEmpty;
      });
    } catch (e) {
      setState(() {
        _isNetworkAvailable = false;
      });

      // Set up retry timer
      if (widget.enableRetry) {
        _retryTimer?.cancel();
        _retryTimer = Timer(widget.retryDelay, _checkNetworkStatus);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isNetworkAvailable) {
      return widget.child;
    }

    return widget.onNetworkUnavailable?.call() ??
        const NetworkUnavailableWidget();
  }
}

/// Custom error state for BLoC
class BlocError {
  final AppError error;
  final dynamic originalState;

  const BlocError(this.error, [this.originalState]);
}

/// Network unavailable widget
class NetworkUnavailableWidget extends StatelessWidget {
  const NetworkUnavailableWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.wifi_off,
                size: 64,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                'Tidak Ada Koneksi Internet',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.bold,
                ),
              textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Periksa koneksi internet Anda dan coba lagi.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  // Retry connection check
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (context) => const NetworkErrorBoundary(
                        child: Scaffold(), // Replace with actual content
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Internal error listener class
class _ErrorListener implements ErrorListener {
  final Function(AppError) onErrorCallback;

  _ErrorListener(this.onErrorCallback);

  @override
  void onError(AppError error, StackTrace? stackTrace) {
    onErrorCallback(error);
  }
}

class ErrorReportingScreen extends StatelessWidget {
  final AppError error;
  final Map<String, dynamic>? errorContext;

  const ErrorReportingScreen({
    super.key,
    required this.error,
    this.errorContext,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Laporan Error')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SelectableText(
          'Code: ${error.code}\n'
          'Message: ${error.message}\n'
          'Type: ${error.runtimeType}\n'
          'Context: ${errorContext ?? {}}',
        ),
      ),
    );
  }
}
