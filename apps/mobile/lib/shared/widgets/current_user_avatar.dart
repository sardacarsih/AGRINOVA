import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/api_constants.dart';
import '../../core/services/unified_secure_storage_service.dart';
import '../../features/auth/presentation/blocs/auth_bloc.dart';

/// Renders current user avatar from local storage (URL/data-uri), fallback initials.
class CurrentUserAvatar extends StatelessWidget {
  final double size;
  final BorderRadius? borderRadius;
  final BoxShape shape;
  final Color backgroundColor;
  final TextStyle? initialsStyle;
  final IconData fallbackIcon;
  final Color fallbackIconColor;

  const CurrentUserAvatar({
    super.key,
    this.size = 56,
    this.borderRadius,
    this.shape = BoxShape.circle,
    this.backgroundColor = const Color(0x33FFFFFF),
    this.initialsStyle,
    this.fallbackIcon = Icons.person_rounded,
    this.fallbackIconColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AuthBloc>().state;
    final user = state is AuthAuthenticated ? state.user : null;
    final initials = _initials(user?.fullName ?? user?.username ?? '');
    final stateAvatar = _normalizeAvatar(user?.avatar);

    return FutureBuilder<String?>(
      future: UnifiedSecureStorageService.getStoredUserAvatar(),
      builder: (context, snapshot) {
        final storedAvatar = _normalizeAvatar(snapshot.data);
        final avatar = stateAvatar.isNotEmpty ? stateAvatar : storedAvatar;
        final bytes = _decodeData(avatar);
        final isUrl =
            avatar.startsWith('http://') || avatar.startsWith('https://');

        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: backgroundColor,
            shape: shape,
            borderRadius: shape == BoxShape.rectangle ? borderRadius : null,
          ),
          child: ClipRRect(
            borderRadius: shape == BoxShape.rectangle
                ? (borderRadius ?? BorderRadius.circular(12))
                : BorderRadius.circular(size),
            child: bytes != null
                ? Image.memory(bytes, fit: BoxFit.cover)
                : isUrl
                    ? Image.network(
                        avatar,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            _fallback(initials),
                      )
                    : _fallback(initials),
          ),
        );
      },
    );
  }

  Widget _fallback(String initials) {
    if (initials.isNotEmpty) {
      return Center(
        child: Text(
          initials,
          style: initialsStyle ??
              const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
        ),
      );
    }
    return Center(
      child: Icon(
        fallbackIcon,
        color: fallbackIconColor,
        size: size * 0.48,
      ),
    );
  }

  String _initials(String value) {
    final parts = value
        .split(' ')
        .where((element) => element.trim().isNotEmpty)
        .take(2)
        .toList();
    if (parts.isEmpty) return '';
    return parts.map((part) => part[0].toUpperCase()).join();
  }

  Uint8List? _decodeData(String value) {
    if (!value.startsWith('data:') || !value.contains(';base64,')) return null;
    final i = value.indexOf(',');
    if (i < 0 || i >= value.length - 1) return null;
    try {
      return base64Decode(value.substring(i + 1));
    } catch (_) {
      return null;
    }
  }

  String _normalizeAvatar(String? raw) {
    final value = (raw ?? '').trim();
    if (value.isEmpty) return '';
    if (value.startsWith('data:')) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    if (value.startsWith('//')) {
      return 'https:$value';
    }

    final base = ApiConstants.baseUrl.replaceAll(RegExp(r'/+$'), '');
    if (value.startsWith('/')) {
      return '$base$value';
    }
    return '$base/$value';
  }
}
