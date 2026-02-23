String resolveReleaseChannelFromVersion(String versionLabel) {
  final value = versionLabel.toLowerCase();
  if (value.contains('-dev.')) {
    return 'internal';
  }
  if (value.contains('-rc.')) {
    return 'closed';
  }
  return 'production';
}

String resolveReleaseChannel({
  required String versionLabel,
  Map<String, dynamic>? metadata,
}) {
  final explicit = metadata?['releaseChannel']?.toString().toLowerCase();
  if (explicit != null &&
      (explicit == 'internal' ||
          explicit == 'closed' ||
          explicit == 'production')) {
    return explicit;
  }

  return resolveReleaseChannelFromVersion(versionLabel);
}

bool isUpdateChannelCompatible({
  required String installedVersion,
  required String updateVersionLabel,
  Map<String, dynamic>? updateMetadata,
}) {
  final currentChannel = resolveReleaseChannelFromVersion(installedVersion);
  final updateChannel = resolveReleaseChannel(
    versionLabel: updateVersionLabel,
    metadata: updateMetadata,
  );

  if (currentChannel == updateChannel) {
    return true;
  }

  final scope = updateMetadata?['releaseScope']?.toString().toLowerCase();
  if (scope == 'all') {
    return true;
  }

  return false;
}
