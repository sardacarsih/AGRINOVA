// Gen Z Welcome Header - Molecule Component for Mandor Dashboard
// Welcome section with user info and offline banner

import 'package:flutter/material.dart';
import '../../../../../../../shared/widgets/current_user_avatar.dart';
import '../mandor_theme.dart';
import '../atoms/genz_status_badge.dart';

/// Welcome header with gradient background and user info
class GenZWelcomeHeader extends StatelessWidget {
  final String userName;
  final String? division;
  final bool isOffline;
  final String? currentTime;

  const GenZWelcomeHeader({
    super.key,
    required this.userName,
    this.division,
    this.isOffline = false,
    this.currentTime,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: MandorTheme.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: MandorTheme.forestGreen.withValues(alpha: 0.3),
            blurRadius: 20,
            spreadRadius: -5,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildUserInfo(),
          if (isOffline) ...[
            const SizedBox(height: 14),
            const GenZOfflineBanner(),
          ],
        ],
      ),
    );
  }

  Widget _buildUserInfo() {
    return Row(
      children: [
        _buildAvatar(),
        const SizedBox(width: 16),
        Expanded(child: _buildUserDetails()),
        if (currentTime != null) _buildTimeBadge(),
      ],
    );
  }

  Widget _buildAvatar() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: const CurrentUserAvatar(
        size: 56,
        shape: BoxShape.rectangle,
        borderRadius: BorderRadius.all(Radius.circular(12)),
      ),
    );
  }

  Widget _buildUserDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Selamat Datang,',
          style: MandorTheme.bodyMedium.copyWith(
            color: Colors.white.withValues(alpha: 0.8),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          userName,
          style: MandorTheme.headingMedium,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        if (division != null) ...[
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Mandor - $division',
              style: MandorTheme.bodySmall.copyWith(
                color: Colors.white.withValues(alpha: 0.9),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTimeBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.access_time_rounded,
            color: Colors.white,
            size: 18,
          ),
          const SizedBox(height: 2),
          Text(
            currentTime!,
            style: MandorTheme.labelBold.copyWith(
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact welcome header for secondary views
class GenZWelcomeHeaderCompact extends StatelessWidget {
  final String userName;
  final String subtitle;
  final IconData? icon;

  const GenZWelcomeHeaderCompact({
    super.key,
    required this.userName,
    required this.subtitle,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardDark(),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration:
                MandorTheme.iconContainer(color: MandorTheme.forestGreen),
            child: Icon(
              icon ?? Icons.person_rounded,
              color: Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(userName, style: MandorTheme.labelBold),
                const SizedBox(height: 2),
                Text(subtitle, style: MandorTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

