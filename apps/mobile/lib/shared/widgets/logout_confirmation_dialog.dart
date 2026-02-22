import 'package:flutter/material.dart';

class LogoutConfirmationDialog extends StatelessWidget {
  final String? username;
  final VoidCallback onConfirm;
  final VoidCallback? onCancel;

  const LogoutConfirmationDialog({
    super.key,
    this.username,
    required this.onConfirm,
    this.onCancel,
  });

  static Future<void> show(
    BuildContext context, {
    String? username,
    required VoidCallback onConfirm,
    VoidCallback? onCancel,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => LogoutConfirmationDialog(
        username: username,
        onConfirm: onConfirm,
        onCancel: onCancel,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.logout, color: Colors.red),
          SizedBox(width: 8),
          Text('Confirm Logout'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Are you sure you want to logout?'),
          SizedBox(height: 8),
          if (username != null)
            Text(
              'User: $username',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
          SizedBox(height: 16),
          Container(
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange[300]!),
            ),
            child: Row(
              children: [
                Icon(Icons.warning, color: Colors.orange, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Any unsaved offline data will remain stored locally and will sync when you login again.',
                    style: TextStyle(
                      color: Colors.orange[800],
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            if (onCancel != null) {
              onCancel!();
            } else {
              Navigator.pop(context);
            }
          },
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context); // Close dialog first
            onConfirm();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          child: Text('Logout'),
        ),
      ],
    );
  }
}
