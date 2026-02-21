import 'package:flutter/material.dart';

class HarvestQuantityInput extends StatelessWidget {
  final int quantity;
  final ValueChanged<int> onChanged;

  const HarvestQuantityInput({
    Key? key,
    required this.quantity,
    required this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Jumlah Janjang',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.1),
                spreadRadius: 1,
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Center(
                  child: Text(
                    quantity.toString(),
                    style: const TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue, // Using a solid color for now, gradient text is complex
                    ),
                  ),
                ),
              ),
              Column(
                children: [
                  _buildButton(
                    icon: Icons.add,
                    color: Colors.green,
                    onTap: () => onChanged(quantity + 1),
                  ),
                  const SizedBox(height: 12),
                  _buildButton(
                    icon: Icons.remove,
                    color: Colors.red,
                    onTap: () => quantity > 0 ? onChanged(quantity - 1) : null,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildButton({
    required IconData icon,
    required Color color,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              color.withOpacity(0.8),
              color,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.3),
              spreadRadius: 1,
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: 24,
        ),
      ),
    );
  }
}
