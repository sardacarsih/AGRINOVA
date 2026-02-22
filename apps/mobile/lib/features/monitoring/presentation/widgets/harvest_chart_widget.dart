import 'package:flutter/material.dart';

class HarvestChartWidget extends StatelessWidget {
  final List<dynamic> chartData;
  final String period;

  const HarvestChartWidget({
    super.key,
    required this.chartData,
    required this.period,
  });

  @override
  Widget build(BuildContext context) {
    return const Card(child: SizedBox(height: 200, child: Center(child: Text('Chart'))));
  }
}
