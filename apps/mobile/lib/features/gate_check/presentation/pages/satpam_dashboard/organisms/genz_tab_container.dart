// Gen Z Tab Container - Organism Component
// Base container with dark gradient background

import 'package:flutter/material.dart';

/// Base container for Gen Z styled tabs
class GenZTabContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;

  const GenZTabContainer({
    Key? key,
    required this.child,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF111827),
            Color(0xFF1F2937),
          ],
        ),
      ),
      child: padding != null
          ? Padding(padding: padding!, child: child)
          : child,
    );
  }
}

/// Scrollable tab container
class GenZScrollableTab extends StatelessWidget {
  final List<Widget> children;
  final EdgeInsets padding;

  const GenZScrollableTab({
    Key? key,
    required this.children,
    this.padding = const EdgeInsets.all(16),
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GenZTabContainer(
      child: SingleChildScrollView(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ...children,
            const SizedBox(height: 100), // Space for bottom nav
          ],
        ),
      ),
    );
  }
}

/// Sliver-based scrollable tab container for complex layouts
class GenZSliverTab extends StatelessWidget {
  final List<Widget> slivers;

  const GenZSliverTab({
    Key? key,
    required this.slivers,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GenZTabContainer(
      child: CustomScrollView(
        slivers: [
          ...slivers,
          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
    );
  }
}
