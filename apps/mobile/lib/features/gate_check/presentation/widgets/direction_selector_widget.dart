import 'package:flutter/material.dart';
import 'gate_check_form_widget.dart';

/// Enhanced Direction Selector Widget for Gate Check
/// 
/// Provides improved text validation and positioning for MASUK/KELUAR labels
/// above icons with proper responsive layout and overflow handling
class DirectionSelectorWidget extends StatelessWidget {
  final GateCheckDirection selectedDirection;
  final ValueChanged<GateCheckDirection> onDirectionChanged;
  final bool isCompact;

  const DirectionSelectorWidget({
    Key? key,
    required this.selectedDirection,
    required this.onDirectionChanged,
    this.isCompact = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.all(isCompact ? 12 : 16),
      padding: EdgeInsets.all(isCompact ? 12 : 16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(isCompact ? 10 : 12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header section
          _buildHeader(context),
          SizedBox(height: isCompact ? 10 : 12),
          
          // Direction buttons section
          _buildDirectionButtons(context),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.info_outline, color: Colors.blue[700], size: isCompact ? 18 : 20),
        SizedBox(width: isCompact ? 6 : 8),
        Expanded(
          child: Text(
            'Pilih Jenis Gate Check',
            style: TextStyle(
              color: Colors.blue[700],
              fontWeight: FontWeight.bold,
              fontSize: isCompact ? 14 : 16,
            ),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildDirectionButtons(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Determine if we should use a compact layout
        final shouldStack = constraints.maxWidth < 300;
        
        if (shouldStack) {
          return Column(
            children: [
              _buildDirectionButton(context, GateCheckDirection.entry, true),
              const SizedBox(height: 8),
              _buildDirectionButton(context, GateCheckDirection.exit, true),
            ],
          );
        } else {
          return Row(
            children: [
              Expanded(
                child: _buildDirectionButton(context, GateCheckDirection.entry, false),
              ),
              SizedBox(width: isCompact ? 8 : 12),
              Expanded(
                child: _buildDirectionButton(context, GateCheckDirection.exit, false),
              ),
            ],
          );
        }
      },
    );
  }

  Widget _buildDirectionButton(BuildContext context, GateCheckDirection direction, bool isStacked) {
    final isSelected = selectedDirection == direction;
    final isEntry = direction == GateCheckDirection.entry;
    final color = isEntry ? Colors.green : Colors.red;
    
    return InkWell(
      onTap: () => onDirectionChanged(direction),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: EdgeInsets.all(isCompact ? 10 : 12),
        decoration: BoxDecoration(
          color: isSelected 
              ? color.withOpacity(0.1)
              : Colors.grey.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? color : Colors.grey,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: isStacked ? _buildStackedLayout(direction, color, isSelected) : _buildRowLayout(direction, color, isSelected),
      ),
    );
  }

  Widget _buildRowLayout(GateCheckDirection direction, Color color, bool isSelected) {
    final isEntry = direction == GateCheckDirection.entry;
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Radio<GateCheckDirection>(
          value: direction,
          groupValue: selectedDirection,
          onChanged: (value) => onDirectionChanged(value!),
          activeColor: color,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        const SizedBox(width: 8),
        Icon(
          isEntry ? Icons.login : Icons.logout,
          color: isSelected ? color : Colors.grey[600],
          size: isCompact ? 20 : 24,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isEntry ? 'MASUK' : 'KELUAR',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: isCompact ? 13 : 14,
                  color: isSelected ? color : Colors.grey[700],
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
              Text(
                isEntry ? 'Kendaraan masuk' : 'Kendaraan keluar',
                style: TextStyle(
                  fontSize: isCompact ? 11 : 12,
                  color: isSelected ? color.withOpacity(0.8) : Colors.grey[600],
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStackedLayout(GateCheckDirection direction, Color color, bool isSelected) {
    final isEntry = direction == GateCheckDirection.entry;
    
    return Column(
      children: [
        Row(
          children: [
            Radio<GateCheckDirection>(
              value: direction,
              groupValue: selectedDirection,
              onChanged: (value) => onDirectionChanged(value!),
              activeColor: color,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            const SizedBox(width: 8),
            Icon(
              isEntry ? Icons.login : Icons.logout,
              color: isSelected ? color : Colors.grey[600],
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isEntry ? 'MASUK' : 'KELUAR',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isSelected ? color : Colors.grey[700],
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Align(
          alignment: Alignment.centerLeft,
          child: Padding(
            padding: const EdgeInsets.only(left: 40), // Align with text above
            child: Text(
              isEntry ? 'Kendaraan masuk area' : 'Kendaraan keluar area',
              style: TextStyle(
                fontSize: 11,
                color: isSelected ? color.withOpacity(0.8) : Colors.grey[600],
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ),
      ],
    );
  }
}