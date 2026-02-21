import 'package:flutter/material.dart';


/// A generic error screen for critical application failures.
/// 
/// This screen is designed to be displayed when the application encounters
/// an unrecoverable error, such as initialization failure.
class AppErrorScreen extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final String? errorDetails;

  const AppErrorScreen({
    super.key,
    this.title = 'Initialization Failed',
    this.message = 'We encountered a problem while starting the application.',
    this.onRetry,
    this.errorDetails,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Safe fallback
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline_rounded,
                color: Colors.redAccent,
                size: 80,
              ),
              const SizedBox(height: 24),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Roboto', // Use generic safe font
                ),
              ),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                  height: 1.5,
                ),
              ),
              if (errorDetails != null) ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[900],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[800]!),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      'Error: $errorDetails',
                      style: const TextStyle(
                        color: Colors.redAccent,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      ),
                      textAlign: TextAlign.left,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 48),
              if (onRetry != null)
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF00E676), // Spring Green
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 16,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
