import 'package:flutter/material.dart';

class StatsCardWidget extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String? trend;

  const StatsCardWidget({
    Key? key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.trend,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(child: Center(child: Text(title)));
  }
}
