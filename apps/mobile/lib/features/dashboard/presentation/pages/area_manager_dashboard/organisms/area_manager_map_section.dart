import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../area_manager_theme.dart';

/// Estate marker data model
class EstateMarker {
  final String name;
  final LatLng position;
  final EstateStatus status;

  const EstateMarker({
    required this.name,
    required this.position,
    required this.status,
  });
}

enum EstateStatus { active, alert, maintenance }

/// Organism: Map Section for Area Manager
/// Interactive map with estate markers and legend
class AreaManagerMapSection extends StatelessWidget {
  final List<EstateMarker> markers;
  final MapController? mapController;

  const AreaManagerMapSection({
    super.key,
    this.markers = const [],
    this.mapController,
  });

  // Default markers for demo (Sumatera/Kalimantan regions)
  static List<EstateMarker> get defaultMarkers => [
        const EstateMarker(
          name: 'Estate Utara',
          position: LatLng(3.5952, 98.6722), // North Sumatera
          status: EstateStatus.active,
        ),
        const EstateMarker(
          name: 'Estate Timur',
          position: LatLng(2.0833, 99.7667), // East
          status: EstateStatus.active,
        ),
        const EstateMarker(
          name: 'Estate Selatan',
          position: LatLng(1.5, 101.45), // Riau
          status: EstateStatus.alert,
        ),
        const EstateMarker(
          name: 'Estate Barat',
          position: LatLng(0.5, 101.45), // West
          status: EstateStatus.active,
        ),
        const EstateMarker(
          name: 'Estate Tengah',
          position: LatLng(2.5, 100.5), // Central
          status: EstateStatus.maintenance,
        ),
        const EstateMarker(
          name: 'Estate Jambi',
          position: LatLng(-1.6, 103.6), // Jambi
          status: EstateStatus.active,
        ),
        const EstateMarker(
          name: 'Estate Kaltim',
          position: LatLng(0.5, 117.15), // East Kalimantan
          status: EstateStatus.active,
        ),
        const EstateMarker(
          name: 'Estate Kalbar',
          position: LatLng(-0.02, 109.34), // West Kalimantan
          status: EstateStatus.alert,
        ),
      ];

  Color _getMarkerColor(EstateStatus status) {
    switch (status) {
      case EstateStatus.active:
        return AreaManagerTheme.activeGreen;
      case EstateStatus.alert:
        return AreaManagerTheme.alertYellow;
      case EstateStatus.maintenance:
        return AreaManagerTheme.maintenanceRed;
    }
  }

  @override
  Widget build(BuildContext context) {
    final estateMarkers = markers.isEmpty ? defaultMarkers : markers;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Map Section', style: AreaManagerTheme.headingMedium),
        const SizedBox(height: 12),
        Container(
          decoration: AreaManagerTheme.mapCardDecoration,
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Map Title
              Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Area Coverage',
                      style: AreaManagerTheme.headingSmall,
                    ),
                    _buildLegend(),
                  ],
                ),
              ),
              // Map
              SizedBox(
                height: 280,
                child: FlutterMap(
                  mapController: mapController,
                  options: MapOptions(
                    initialCenter:
                        const LatLng(1.5, 103.5), // Center on Sumatera
                    initialZoom: 5.0,
                    minZoom: 4.0,
                    maxZoom: 12.0,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                  ),
                  children: [
                    // Satellite tile layer (Esri World Imagery - free)
                    TileLayer(
                      urlTemplate:
                          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                      userAgentPackageName: 'com.agrinova.mobile',
                      maxZoom: 18,
                    ),
                    // Markers layer
                    MarkerLayer(
                      markers: estateMarkers.map((estate) {
                        return Marker(
                          point: estate.position,
                          width: 36,
                          height: 36,
                          child: _buildMarker(estate),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMarker(EstateMarker estate) {
    final color = _getMarkerColor(estate.status);
    return Container(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.5),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Icon(
        Icons.location_on,
        color: Colors.white,
        size: 20,
      ),
    );
  }

  Widget _buildLegend() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _legendItem('Active:', AreaManagerTheme.activeGreen),
        const SizedBox(width: 8),
        _legendItem('Alert:', AreaManagerTheme.alertYellow),
        const SizedBox(width: 8),
        _legendItem('Maint:', AreaManagerTheme.maintenanceRed),
      ],
    );
  }

  Widget _legendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 3),
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
      ],
    );
  }
}
