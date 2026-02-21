import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';

/// Service for managing user profile photos
/// 
/// Stores profile photos locally in the app's documents directory
/// and persists the path in SharedPreferences.
class ProfilePhotoService {
  static final ProfilePhotoService _instance = ProfilePhotoService._internal();
  factory ProfilePhotoService() => _instance;
  ProfilePhotoService._internal();

  final Logger _logger = Logger();
  static const String _prefsKey = 'profile_photo_';

  /// Get the profile photo path for a user
  /// Returns null if no photo is saved
  Future<String?> getProfilePhotoPath(String userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final photoPath = prefs.getString('$_prefsKey$userId');
      
      if (photoPath != null && await File(photoPath).exists()) {
        return photoPath;
      }
      
      // Clean up stale reference if file doesn't exist
      if (photoPath != null) {
        await prefs.remove('$_prefsKey$userId');
      }
      
      return null;
    } catch (e) {
      _logger.e('Error getting profile photo path', error: e);
      return null;
    }
  }

  /// Save a profile photo for a user
  /// Copies the photo to app documents and stores the path
  Future<String?> saveProfilePhoto(String userId, File photoFile) async {
    try {
      // Get app documents directory
      final appDir = await getApplicationDocumentsDirectory();
      final profilePhotosDir = Directory('${appDir.path}/profile_photos');
      
      // Create directory if it doesn't exist
      if (!await profilePhotosDir.exists()) {
        await profilePhotosDir.create(recursive: true);
      }
      
      // Generate unique filename
      final extension = path.extension(photoFile.path);
      final fileName = 'profile_${userId}_${DateTime.now().millisecondsSinceEpoch}$extension';
      final newPath = '${profilePhotosDir.path}/$fileName';
      
      // Delete old photo if exists
      await deleteProfilePhoto(userId);
      
      // Copy file to new location
      await photoFile.copy(newPath);
      
      // Save path to preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('$_prefsKey$userId', newPath);
      
      _logger.i('Profile photo saved: $newPath');
      return newPath;
    } catch (e) {
      _logger.e('Error saving profile photo', error: e);
      return null;
    }
  }

  /// Delete profile photo for a user
  Future<bool> deleteProfilePhoto(String userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final photoPath = prefs.getString('$_prefsKey$userId');
      
      if (photoPath != null) {
        final file = File(photoPath);
        if (await file.exists()) {
          await file.delete();
        }
        await prefs.remove('$_prefsKey$userId');
        _logger.i('Profile photo deleted for user: $userId');
      }
      
      return true;
    } catch (e) {
      _logger.e('Error deleting profile photo', error: e);
      return false;
    }
  }
}
