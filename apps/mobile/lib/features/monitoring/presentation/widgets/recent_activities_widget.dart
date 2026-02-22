import 'package:flutter/material.dart';

class RecentActivitiesWidget extends StatelessWidget {
  final List<dynamic> activities;
  final String? estateId;

  const RecentActivitiesWidget({
    super.key,
    required this.activities,
    this.estateId,
  });

  @override
  Widget build(BuildContext context) {
    return const Card(child: Center(child: Text('Activities')));
  }
}
