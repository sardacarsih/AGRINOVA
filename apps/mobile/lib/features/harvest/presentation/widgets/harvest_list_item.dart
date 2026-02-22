import 'package:flutter/material.dart';
import '../../domain/entities/harvest_entity.dart';

class HarvestListItem extends StatelessWidget {
  final Harvest harvest;

  const HarvestListItem({
    super.key,
    required this.harvest,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E), // Dark card background
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Avatar with gradient border
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF00E676), Color(0xFF2979FF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: CircleAvatar(
              radius: 24,
              backgroundColor: const Color(0xFF2C2C2C),
              child: Text(
                harvest.employeeName.isNotEmpty ? harvest.employeeName[0] : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  harvest.employeeName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _buildIconText(
                      Icons.agriculture,
                      'Janjang: ${harvest.tbsQuantity.toInt()}',
                      const Color(0xFFFF8A80),
                    ),
                    const SizedBox(width: 12),
                    _buildIconText(
                      Icons.scale,
                      'BJR: ${harvest.tbsQuality.toStringAsFixed(1)} kg',
                      const Color(0xFF80D8FF),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  harvest.blockName,
                  style: TextStyle(
                    color: Colors.grey[400],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          
          // Status Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF00E676),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'Draft', // Using 'Draft' as per image, or map from harvest.status
              style: TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIconText(IconData icon, String text, Color color) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(
            color: Colors.grey[300],
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

