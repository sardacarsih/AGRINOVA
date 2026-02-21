import 'package:flutter/material.dart';

class RecentActivitiesWidget extends StatelessWidget {
  final List<dynamic> activities;
  final String? estateId;

  const RecentActivitiesWidget({
    Key? key,
    required this.activities,
    this.estateId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Card(child: Center(child: Text('Activities')));
  }
}
