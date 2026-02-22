import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';


class AutoSaveService {
  static const String _autoSaveKey = 'harvest_autosave_data';
  static const String _lastSaveKey = 'harvest_autosave_timestamp';
  static const Duration _autoSaveInterval = Duration(seconds: 30);
  static const Duration _maxAge = Duration(hours: 24);

  Timer? _autoSaveTimer;
  final Map<String, dynamic> _currentFormData = {};
  DateTime? _lastSaveTime;
  final ValueNotifier<bool> _hasUnsavedChanges = ValueNotifier(false);

  ValueNotifier<bool> get hasUnsavedChanges => _hasUnsavedChanges;

  // Start auto-save for a form
  void startAutoSave(Map<String, dynamic> initialData) {
    _currentFormData.clear();
    _currentFormData.addAll(initialData);
    _lastSaveTime = DateTime.now();

    // Start periodic auto-save
    _autoSaveTimer?.cancel();
    _autoSaveTimer = Timer.periodic(_autoSaveInterval, (_) {
      _performAutoSave();
    });

    // Initial save
    _performAutoSave();
  }

  // Update form data (called when form fields change)
  void updateFormData(Map<String, dynamic> newData) {
    _currentFormData.clear();
    _currentFormData.addAll(newData);

    // Mark as having unsaved changes
    if (!_hasUnsavedChanges.value) {
      _hasUnsavedChanges.value = true;
    }
  }

  // Stop auto-save
  void stopAutoSave() {
    _autoSaveTimer?.cancel();
    _autoSaveTimer = null;
    _hasUnsavedChanges.value = false;
  }

  // Perform the actual auto-save operation
  Future<void> _performAutoSave() async {
    try {
      if (_currentFormData.isEmpty) return;

      final prefs = await SharedPreferences.getInstance();

      // Save form data
      await prefs.setString(_autoSaveKey, _currentFormData.toString());

      // Save timestamp
      _lastSaveTime = DateTime.now();
      await prefs.setString(_lastSaveKey, _lastSaveTime!.toIso8601String());

      // Mark as saved
      _hasUnsavedChanges.value = false;

      if (kDebugMode) {
        print('Auto-save completed at ${_lastSaveTime!.toIso8601String()}');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Auto-save failed: $e');
      }
    }
  }

  // Check if there's saved data to restore
  Future<bool> hasSavedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastSaveString = prefs.getString(_lastSaveKey);

      if (lastSaveString == null) return false;

      final lastSave = DateTime.parse(lastSaveString);
      final now = DateTime.now();

      // Check if data is not too old
      return now.difference(lastSave) < _maxAge;
    } catch (e) {
      if (kDebugMode) {
        print('Error checking saved data: $e');
      }
      return false;
    }
  }

  // Get saved form data
  Future<Map<String, dynamic>?> getSavedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final dataString = prefs.getString(_autoSaveKey);

      if (dataString == null || dataString.isEmpty) return null;

      // Parse the saved data (simplified - in production, use proper JSON)
      return _parseFormData(dataString);
    } catch (e) {
      if (kDebugMode) {
        print('Error getting saved data: $e');
      }
      return null;
    }
  }

  // Clear saved data
  Future<void> clearSavedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_autoSaveKey);
      await prefs.remove(_lastSaveKey);

      _currentFormData.clear();
      _hasUnsavedChanges.value = false;
    } catch (e) {
      if (kDebugMode) {
        print('Error clearing saved data: $e');
      }
    }
  }

  // Parse form data from string (simplified implementation)
  Map<String, dynamic> _parseFormData(String dataString) {
    // This is a simplified parser - in production, use proper JSON serialization
    final Map<String, dynamic> data = {};

    // Basic parsing logic (would need to be enhanced for production)
    final pairs = dataString.split(',');
    for (final pair in pairs) {
      final parts = pair.split(':');
      if (parts.length == 2) {
        final key = parts[0].trim().replaceAll('{', '').replaceAll('}', '').replaceAll('"', '');
        final value = parts[1].trim().replaceAll('"', '');
        data[key] = value;
      }
    }

    return data;
  }

  // Get last save time
  DateTime? get lastSaveTime => _lastSaveTime;

  // Dispose resources
  void dispose() {
    _autoSaveTimer?.cancel();
    _hasUnsavedChanges.dispose();
  }
}

// Widget that provides auto-save functionality to forms
class AutoSaveFormWrapper extends StatefulWidget {
  final Widget child;
  final Map<String, dynamic> initialData;
  final ValueChanged<Map<String, dynamic>>? onDataRestored;
  final VoidCallback? onAutoSaveCompleted;

  const AutoSaveFormWrapper({
    super.key,
    required this.child,
    required this.initialData,
    this.onDataRestored,
    this.onAutoSaveCompleted,
  });

  @override
  State<AutoSaveFormWrapper> createState() => _AutoSaveFormWrapperState();
}

class _AutoSaveFormWrapperState extends State<AutoSaveFormWrapper> {
  late final AutoSaveService _autoSaveService;
  bool _hasRestoredData = false;

  @override
  void initState() {
    super.initState();
    _autoSaveService = AutoSaveService();
    _checkAndRestoreData();
  }

  @override
  void dispose() {
    _autoSaveService.dispose();
    super.dispose();
  }

  Future<void> _checkAndRestoreData() async {
    final hasData = await _autoSaveService.hasSavedData();
    Map<String, dynamic>? restoredData;

    if (hasData) {
      restoredData = await _autoSaveService.getSavedData();
      if (restoredData != null && !_hasRestoredData) {
        setState(() {
          _hasRestoredData = true;
        });

        widget.onDataRestored?.call(restoredData);

        // Show restoration notification
        _showRestoreNotification();
      }
    }

    // Start auto-save with current or restored data
    _autoSaveService.startAutoSave(
      _hasRestoredData ? restoredData ?? widget.initialData : widget.initialData,
    );
  }

  void _showRestoreNotification() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Data formulir sebelumnya telah dipulihkan'),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'Clear',
          onPressed: () {
            _autoSaveService.clearSavedData();
            widget.onDataRestored?.call(widget.initialData);
          },
          textColor: Colors.white,
        ),
      ),
    );
  }

  // Update form data (call this from form fields)
  void updateFormData(Map<String, dynamic> data) {
    _autoSaveService.updateFormData(data);
  }

  // Save form data manually
  void saveFormData() {
    _autoSaveService._performAutoSave();
    widget.onAutoSaveCompleted?.call();
  }

  // Clear saved data
  void clearSavedData() {
    _autoSaveService.clearSavedData();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: _autoSaveService.hasUnsavedChanges,
      builder: (context, hasUnsavedChanges, child) {
        return Stack(
          children: [
            child!,
            // Auto-save indicator
            if (hasUnsavedChanges)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'Menyimpan...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
      child: widget.child,
    );
  }
}

