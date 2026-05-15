import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

class TourneeMapScreen extends StatefulWidget {
  final Map<String, dynamic> tournee;

  const TourneeMapScreen({
    super.key,
    required this.tournee,
  });

  @override
  State<TourneeMapScreen> createState() => _TourneeMapScreenState();
}

class _TourneeMapScreenState extends State<TourneeMapScreen> {
  static const LatLng defaultCenter = LatLng(36.8065, 10.1815);

  GoogleMapController? _mapController;
  Set<Polyline> _polylines = {};
  bool _loadingRoute = false;

  @override
  void initState() {
    super.initState();
    _loadRoutePolyline();
  }

  @override
  void didUpdateWidget(covariant TourneeMapScreen oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.tournee['id'] != widget.tournee['id']) {
      _loadRoutePolyline();
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  double? _toDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  String _text(dynamic value) {
    return String.fromCharCodes('$value'.runes).trim();
  }

  List<Map<String, dynamic>> _stopsJson() {
    final raw = widget.tournee['stops'];
    if (raw is! List) return [];

    return raw
        .whereType<Map>()
        .map((item) => item.map((key, value) => MapEntry('$key', value)))
        .toList();
  }

  LatLng? _fallbackDepot() {
    final depot = _text(widget.tournee['depot_depart']).toLowerCase();
    final label = _text(widget.tournee['depot_label']).toLowerCase();
    final adresse = _text(widget.tournee['depot_adresse']).toLowerCase();
    final value = '$depot $label $adresse';

    if (value.contains('sousse')) {
      return const LatLng(35.77005959180682, 10.594931528518906);
    }

    if (value.contains('kairouan')) {
      return const LatLng(35.68779123889766, 10.083732874866017);
    }

    return null;
  }

  _MapPoint? _depotPoint() {
    final lat = _toDouble(widget.tournee['depot_latitude']);
    final lng = _toDouble(widget.tournee['depot_longitude']);

    LatLng? position;

    if (lat != null && lng != null) {
      position = LatLng(lat, lng);
    } else {
      position = _fallbackDepot();
    }

    if (position == null) return null;

    final title = _text(widget.tournee['depot_label']).isNotEmpty
        ? _text(widget.tournee['depot_label'])
        : 'Dépôt';

    final subtitle = _text(widget.tournee['depot_adresse']);

    return _MapPoint(
      id: 'depot',
      order: 0,
      position: position,
      title: title,
      subtitle: subtitle,
      isDepot: true,
    );
  }

  List<_MapPoint> _stopPoints() {
    final stops = _stopsJson();

    final result = <_MapPoint>[];

    for (int i = 0; i < stops.length; i++) {
      final stop = stops[i];

      final lat = _toDouble(stop['latitude']);
      final lng = _toDouble(stop['longitude']);

      if (lat == null || lng == null) continue;

      final order = int.tryParse('${stop['ordre'] ?? i + 1}') ?? i + 1;
      final tracking = _text(stop['numero_suivi']);
      final adresse = _text(stop['adresse']).isNotEmpty
          ? _text(stop['adresse'])
          : _text(stop['adresse_livraison']);

      final client = _text(stop['nom_destinataire']);
      final phone = _text(stop['telephone_destinataire']);

      result.add(
        _MapPoint(
          id: 'stop_${stop['colis_id'] ?? order}',
          order: order,
          position: LatLng(lat, lng),
          title: 'Arrêt $order${tracking.isNotEmpty ? ' - $tracking' : ''}',
          subtitle: [
            adresse,
            client,
            phone,
          ].where((x) => x.trim().isNotEmpty).join(' | '),
          isDepot: false,
        ),
      );
    }

    result.sort((a, b) => a.order.compareTo(b.order));
    return result;
  }

  List<_MapPoint> _allMarkerPoints() {
    final depot = _depotPoint();
    final stops = _stopPoints();

    if (depot == null) return stops;
    return [depot, ...stops];
  }

  List<LatLng> _pathPoints() {
    return _allMarkerPoints().map((point) => point.position).toList();
  }

  Set<Marker> _markers() {
    final points = _allMarkerPoints();

    return points.map((point) {
      return Marker(
        markerId: MarkerId(point.id),
        position: point.position,
        icon: point.isDepot
            ? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure)
            : BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(
          title: point.isDepot ? 'Dépôt' : point.title,
          snippet: point.subtitle,
        ),
      );
    }).toSet();
  }

  Set<Polyline> _directPolyline() {
    final points = _pathPoints();

    if (points.length < 2) return {};

    return {
      Polyline(
        polylineId: const PolylineId('direct_route'),
        points: points,
        width: 5,
        geodesic: true,
      ),
    };
  }

  List<List<LatLng>> _buildSegments(List<LatLng> points) {
    const int maxPointsPerSegment = 25;

    if (points.length < 2) return [];

    final segments = <List<LatLng>>[];
    var startIndex = 0;

    while (startIndex < points.length - 1) {
      final endIndex = math.min(
        points.length - 1,
        startIndex + maxPointsPerSegment - 1,
      );

      segments.add(points.sublist(startIndex, endIndex + 1));
      startIndex = endIndex;
    }

    return segments;
  }

  Future<List<LatLng>> _fetchOsrmPolyline(List<LatLng> points) async {
    final segments = _buildSegments(points);
    final fullRoute = <LatLng>[];

    for (final segment in segments) {
      final coords = segment
          .map((point) => '${point.longitude},${point.latitude}')
          .join(';');

      final uri = Uri.parse(
        'https://router.project-osrm.org/route/v1/driving/$coords'
        '?overview=full&geometries=geojson&steps=false',
      );

      final response = await http.get(uri).timeout(
            const Duration(seconds: 20),
          );

      if (response.statusCode != 200) {
        throw Exception('OSRM error ${response.statusCode}');
      }

      final decoded = jsonDecode(response.body);

      if (decoded is! Map<String, dynamic>) {
        throw Exception('Invalid OSRM response');
      }

      final routes = decoded['routes'];

      if (routes is! List || routes.isEmpty) {
        throw Exception('No OSRM route');
      }

      final firstRoute = routes.first;

      if (firstRoute is! Map<String, dynamic>) {
        throw Exception('Invalid route object');
      }

      final geometry = firstRoute['geometry'];

      if (geometry is! Map<String, dynamic>) {
        throw Exception('Invalid geometry');
      }

      final coordinates = geometry['coordinates'];

      if (coordinates is! List || coordinates.isEmpty) {
        throw Exception('No route coordinates');
      }

      final segmentPoints = <LatLng>[];

      for (final item in coordinates) {
        if (item is List && item.length >= 2) {
          final lng = _toDouble(item[0]);
          final lat = _toDouble(item[1]);

          if (lat != null && lng != null) {
            segmentPoints.add(LatLng(lat, lng));
          }
        }
      }

      if (segmentPoints.isEmpty) {
        throw Exception('Empty OSRM segment');
      }

      if (fullRoute.isNotEmpty && segmentPoints.isNotEmpty) {
        segmentPoints.removeAt(0);
      }

      fullRoute.addAll(segmentPoints);
    }

    return fullRoute;
  }

  Future<void> _loadRoutePolyline() async {
    final points = _pathPoints();

    if (points.length < 2) {
      setState(() {
        _polylines = {};
        _loadingRoute = false;
      });
      return;
    }

    setState(() {
      _loadingRoute = true;
    });

    try {
      final osrmPoints = await _fetchOsrmPolyline(points);

      if (!mounted) return;

      setState(() {
        _polylines = {
          Polyline(
            polylineId: const PolylineId('road_route'),
            points: osrmPoints,
            width: 5,
            geodesic: true,
          ),
        };
        _loadingRoute = false;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _polylines = _directPolyline();
        _loadingRoute = false;
      });
    }
  }

  LatLngBounds _boundsFromPoints(List<LatLng> points) {
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;

    for (final point in points) {
      minLat = math.min(minLat, point.latitude);
      maxLat = math.max(maxLat, point.latitude);
      minLng = math.min(minLng, point.longitude);
      maxLng = math.max(maxLng, point.longitude);
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  Future<void> _fitMapToRoute() async {
    final controller = _mapController;
    final points = _pathPoints();

    if (controller == null || points.isEmpty) return;

    await Future.delayed(const Duration(milliseconds: 350));

    if (!mounted) return;

    if (points.length == 1) {
      await controller.animateCamera(
        CameraUpdate.newLatLngZoom(points.first, 14),
      );
      return;
    }

    final bounds = _boundsFromPoints(points);

    await controller.animateCamera(
      CameraUpdate.newLatLngBounds(bounds, 70),
    );
  }

  Future<void> _openGoogleMaps() async {
    final points = _pathPoints();

    if (points.length < 2) return;

    final origin = '${points.first.latitude},${points.first.longitude}';
    final destination = '${points.last.latitude},${points.last.longitude}';

    final middlePoints = points.length > 2
        ? points.sublist(1, points.length - 1).take(23).toList()
        : <LatLng>[];

    final params = <String, String>{
      'api': '1',
      'origin': origin,
      'destination': destination,
      'travelmode': 'driving',
    };

    if (middlePoints.isNotEmpty) {
      params['waypoints'] = middlePoints
          .map((point) => '${point.latitude},${point.longitude}')
          .join('|');
    }

    final uri = Uri.https(
      'www.google.com',
      '/maps/dir/',
      params,
    );

    await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) {
    final tourneeName = _text(widget.tournee['nom']).isNotEmpty
        ? _text(widget.tournee['nom'])
        : 'Tournée';

    final stopCount = _stopPoints().length;
    final markers = _markers();
    final path = _pathPoints();

    final initialPosition = path.isNotEmpty ? path.first : defaultCenter;

    return Scaffold(
      appBar: AppBar(
        title: Text(tourneeName),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: _fitMapToRoute,
          ),
        ],
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: initialPosition,
              zoom: path.isNotEmpty ? 10 : 7,
            ),
            markers: markers,
            polylines: _polylines,
            mapType: MapType.normal,
            zoomControlsEnabled: false,
            myLocationButtonEnabled: false,
            onMapCreated: (controller) {
              _mapController = controller;
              _fitMapToRoute();
            },
          ),

          if (_loadingRoute)
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: const [
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 12),
                      Text('Calcul du trajet...'),
                    ],
                  ),
                ),
              ),
            ),

          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: SafeArea(
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tourneeName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '$stopCount arrêt(s) sur la carte',
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: path.length >= 2 ? _openGoogleMaps : null,
                              icon: const Icon(Icons.navigation),
                              label: const Text('Ouvrir Google Maps'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          IconButton.filledTonal(
                            onPressed: _fitMapToRoute,
                            icon: const Icon(Icons.center_focus_strong),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapPoint {
  final String id;
  final int order;
  final LatLng position;
  final String title;
  final String subtitle;
  final bool isDepot;

  const _MapPoint({
    required this.id,
    required this.order,
    required this.position,
    required this.title,
    required this.subtitle,
    required this.isDepot,
  });
}