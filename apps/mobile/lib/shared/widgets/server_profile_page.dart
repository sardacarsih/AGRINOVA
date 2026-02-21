import 'package:flutter/material.dart';

import '../../features/dashboard/presentation/pages/mandor_dashboard/organisms/genz_profile_tab.dart'
    as mandor_profile;

/// Shared profile page that uses server-backed CRUD implementation.
class ServerProfilePage extends StatelessWidget {
  final String title;
  final bool showAppBar;
  final VoidCallback? onLogout;

  const ServerProfilePage({
    super.key,
    this.title = 'Profil',
    this.showAppBar = true,
    this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final content = mandor_profile.GenZProfileTab(onLogout: onLogout);
    if (!showAppBar) {
      return content;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: content,
    );
  }
}
