import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:logger/logger.dart';

import 'permission_service.dart';

class LocationService {
  static final Logger _logger = Logger();
  final PermissionService _permissionService;
  
  StreamSubscription<Position>? _positionStreamSubscription;
  final StreamController<Position> _positionController = StreamController<Position>.broadcast();
  
  Position? _lastKnownPosition;
  bool _isTracking = false;

  LocationService({
    required PermissionService permissionService,
  }) : _permissionService = permissionService;

  // Getters
  Stream<Position> get positionStream => _positionController.stream;
  Position? get lastKnownPosition => _lastKnownPosition;
  bool get isTracking => _isTracking;

  // Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (e) {
      _logger.e('Error checking location service: $e');
      return false;
    }
  }

  // Get current location permission status
  Future<LocationPermission> getLocationPermission() async {
    try {
      return await Geolocator.checkPermission();
    } catch (e) {
      _logger.e('Error checking location permission: $e');
      return LocationPermission.denied;
    }
  }

  // Request location permission
  Future<LocationPermission> requestLocationPermission() async {
    try {
      // First check if location services are enabled
      if (!await isLocationServiceEnabled()) {
        _logger.w('Location services are disabled');
        return LocationPermission.denied;
      }

      LocationPermission permission = await getLocationPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        
        if (permission == LocationPermission.denied) {
          _logger.w('Location permission denied');
          return LocationPermission.denied;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _logger.w('Location permission denied forever');
        return LocationPermission.deniedForever;
      }

      _logger.d('Location permission granted: $permission');
      return permission;
    } catch (e) {
      _logger.e('Error requesting location permission: $e');
      return LocationPermission.denied;
    }
  }

  // Get current position
  Future<Position?> getCurrentPosition({
    LocationAccuracy accuracy = LocationAccuracy.high,
    Duration timeout = const Duration(seconds: 10),
  }) async {
    try {
      // Check permissions
      final permission = await requestLocationPermission();
      if (permission != LocationPermission.whileInUse && 
          permission != LocationPermission.always) {
        _logger.w('Location permission not granted for getting position');
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: accuracy,
        timeLimit: timeout,
      );

      _lastKnownPosition = position;
      _logger.d('Got current position: ${position.latitude}, ${position.longitude}');
      return position;
    } catch (e) {
      _logger.e('Error getting current position: $e');
      return null;
    }
  }

  // Get last known position
  Future<Position?> getLastKnownPosition() async {
    try {
      final position = await Geolocator.getLastKnownPosition();
      if (position != null) {
        _lastKnownPosition = position;
        _logger.d('Got last known position: ${position.latitude}, ${position.longitude}');
      }
      return position;
    } catch (e) {
      _logger.e('Error getting last known position: $e');
      return null;
    }
  }

  // Start location tracking
  Future<bool> startTracking({
    LocationAccuracy accuracy = LocationAccuracy.high,
    int distanceFilter = 10,
    Duration interval = const Duration(seconds: 5),
  }) async {
    try {
      // Check if already tracking
      if (_isTracking) {
        _logger.w('Location tracking is already active');
        return true;
      }

      // Check permissions
      final permission = await requestLocationPermission();
      if (permission != LocationPermission.whileInUse && 
          permission != LocationPermission.always) {
        _logger.w('Location permission not granted for tracking');
        return false;
      }

      // Set up location settings
      final locationSettings = LocationSettings(
        accuracy: accuracy,
        distanceFilter: distanceFilter,
        timeLimit: interval,
      );

      // Start position stream
      _positionStreamSubscription = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (Position position) {
          _lastKnownPosition = position;
          _positionController.add(position);
          _logger.d('Position update: ${position.latitude}, ${position.longitude}');
        },
        onError: (error) {
          _logger.e('Position stream error: $error');
        },
      );

      _isTracking = true;
      _logger.d('Location tracking started');
      return true;
    } catch (e) {
      _logger.e('Error starting location tracking: $e');
      return false;
    }
  }

  // Stop location tracking
  Future<void> stopTracking() async {
    try {
      await _positionStreamSubscription?.cancel();
      _positionStreamSubscription = null;
      _isTracking = false;
      _logger.d('Location tracking stopped');
    } catch (e) {
      _logger.e('Error stopping location tracking: $e');
    }
  }

  // Calculate distance between two positions
  double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    try {
      return Geolocator.distanceBetween(
        startLatitude,
        startLongitude,
        endLatitude,
        endLongitude,
      );
    } catch (e) {
      _logger.e('Error calculating distance: $e');
      return 0.0;
    }
  }

  // Calculate bearing between two positions
  double calculateBearing(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    try {
      return Geolocator.bearingBetween(
        startLatitude,
        startLongitude,
        endLatitude,
        endLongitude,
      );
    } catch (e) {
      _logger.e('Error calculating bearing: $e');
      return 0.0;
    }
  }

  // Check if position is within a geofence
  bool isWithinGeofence(
    Position position,
    double centerLatitude,
    double centerLongitude,
    double radiusInMeters,
  ) {
    try {
      final distance = calculateDistance(
        position.latitude,
        position.longitude,
        centerLatitude,
        centerLongitude,
      );
      return distance <= radiusInMeters;
    } catch (e) {
      _logger.e('Error checking geofence: $e');
      return false;
    }
  }

  // Format position for display
  String formatPosition(Position position, {int precision = 6}) {
    return '${position.latitude.toStringAsFixed(precision)}, ${position.longitude.toStringAsFixed(precision)}';
  }

  // Format distance for display
  String formatDistance(double distanceInMeters) {
    if (distanceInMeters < 1000) {
      return '${distanceInMeters.toStringAsFixed(0)} m';
    } else {
      return '${(distanceInMeters / 1000).toStringAsFixed(2)} km';
    }
  }

  // Get position accuracy level
  String getAccuracyLevel(double accuracy) {
    if (accuracy <= 5) {
      return 'Excellent';
    } else if (accuracy <= 10) {
      return 'Good';
    } else if (accuracy <= 20) {
      return 'Fair';
    } else {
      return 'Poor';
    }
  }

  // Convert position to map data
  Map<String, dynamic> positionToMap(Position position) {
    return {
      'latitude': position.latitude,
      'longitude': position.longitude,
      'altitude': position.altitude,
      'accuracy': position.accuracy,
      'heading': position.heading,
      'speed': position.speed,
      'speedAccuracy': position.speedAccuracy,
      'timestamp': position.timestamp.toIso8601String(),
    };
  }

  // Create position from map data
  Position? positionFromMap(Map<String, dynamic> map) {
    try {
      return Position(
        longitude: map['longitude']?.toDouble() ?? 0.0,
        latitude: map['latitude']?.toDouble() ?? 0.0,
        timestamp: DateTime.tryParse(map['timestamp'] ?? '') ?? DateTime.now(),
        accuracy: map['accuracy']?.toDouble() ?? 0.0,
        altitude: map['altitude']?.toDouble() ?? 0.0,
        altitudeAccuracy: map['altitudeAccuracy']?.toDouble() ?? 0.0,
        heading: map['heading']?.toDouble() ?? 0.0,
        headingAccuracy: map['headingAccuracy']?.toDouble() ?? 0.0,
        speed: map['speed']?.toDouble() ?? 0.0,
        speedAccuracy: map['speedAccuracy']?.toDouble() ?? 0.0,
      );
    } catch (e) {
      _logger.e('Error creating position from map: $e');
      return null;
    }
  }

  // Open location settings
  Future<bool> openLocationSettings() async {
    try {
      return await Geolocator.openLocationSettings();
    } catch (e) {
      _logger.e('Error opening location settings: $e');
      return false;
    }
  }

  // Dispose resources
  void dispose() {
    try {
      stopTracking();
      _positionController.close();
      _logger.d('Location service disposed');
    } catch (e) {
      _logger.e('Error disposing location service: $e');
    }
  }
}