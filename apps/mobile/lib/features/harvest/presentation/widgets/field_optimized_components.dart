import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Field-optimized text input widget with larger touch targets and better visibility
class FieldOptimizedTextField extends StatefulWidget {
  final TextEditingController controller;
  final String? labelText;
  final String? hintText;
  final IconData? prefixIcon;
  final String? suffixText;
  final TextInputType keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final bool obscureText;
  final int maxLines;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;
  final bool enabled;
  final FocusNode? focusNode;

  const FieldOptimizedTextField({
    Key? key,
    required this.controller,
    this.labelText,
    this.hintText,
    this.prefixIcon,
    this.suffixText,
    this.keyboardType = TextInputType.text,
    this.inputFormatters,
    this.validator,
    this.obscureText = false,
    this.maxLines = 1,
    this.onChanged,
    this.onTap,
    this.enabled = true,
    this.focusNode,
  }) : super(key: key);

  @override
  State<FieldOptimizedTextField> createState() => _FieldOptimizedTextFieldState();
}

class _FieldOptimizedTextFieldState extends State<FieldOptimizedTextField> {
  bool _isFocused = false;
  late FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    super.dispose();
  }

  void _onFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: TextFormField(
        controller: widget.controller,
        focusNode: _focusNode,
        enabled: widget.enabled,
        obscureText: widget.obscureText,
        keyboardType: widget.keyboardType,
        inputFormatters: widget.inputFormatters,
        validator: widget.validator,
        maxLines: widget.maxLines,
        onChanged: widget.onChanged,
        onTap: widget.onTap,
        style: TextStyle(
          fontSize: 18, // Larger font for better visibility
          fontWeight: FontWeight.w500,
          color: widget.enabled ? Colors.black87 : Colors.grey,
        ),
        decoration: InputDecoration(
          labelText: widget.labelText,
          hintText: widget.hintText,
          prefixIcon: widget.prefixIcon != null
              ? Container(
                  margin: const EdgeInsets.all(12),
                  child: Icon(
                    widget.prefixIcon,
                    size: 24, // Larger icon
                    color: _isFocused ? Theme.of(context).colorScheme.primary : Colors.grey.shade600,
                  ),
                )
              : null,
          suffixText: widget.suffixText,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: Colors.grey.shade300,
              width: 2,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: Colors.grey.shade300,
              width: 2,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: Theme.of(context).colorScheme.primary,
              width: 3, // Thicker border when focused
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: Colors.red,
              width: 2,
            ),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 16, // Taller input fields
          ),
          filled: true,
          fillColor: widget.enabled ? Colors.white : Colors.grey.shade100,
          labelStyle: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: _isFocused ? Theme.of(context).colorScheme.primary : Colors.grey.shade600,
          ),
          hintStyle: TextStyle(
            fontSize: 16,
            color: Colors.grey.shade500,
          ),
          errorStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

/// Field-optimized button with larger touch targets
class FieldOptimizedButton extends StatelessWidget {
  final String text;
  final IconData? icon;
  final VoidCallback onPressed;
  final Color? backgroundColor;
  final Color? textColor;
  final bool isLoading;
  final bool isSecondary;

  const FieldOptimizedButton({
    Key? key,
    required this.text,
    this.icon,
    required this.onPressed,
    this.backgroundColor,
    this.textColor,
    this.isLoading = false,
    this.isSecondary = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Container(
      width: double.infinity,
      height: 56, // Larger touch target (minimum 44x44 for accessibility)
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: isSecondary
              ? Colors.transparent
              : backgroundColor ?? colors.primary,
          foregroundColor: isSecondary
              ? colors.primary
              : textColor ?? Colors.white,
          side: isSecondary
              ? BorderSide(color: colors.primary, width: 2)
              : null,
          elevation: isSecondary ? 0 : 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
        child: isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(
                      icon,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    text,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// Field-optimized card with better contrast and shadow
class FieldOptimizedCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final double? elevation;
  final VoidCallback? onTap;

  const FieldOptimizedCard({
    Key? key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.elevation,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        elevation: elevation ?? 3,
        borderRadius: BorderRadius.circular(16),
        shadowColor: Colors.black.withOpacity(0.2),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: padding ?? const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: backgroundColor ?? Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.grey.shade200,
                width: 1,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Field-optimized selection widget
class FieldOptimizedSelector<T> extends StatelessWidget {
  final String label;
  final T? selectedValue;
  final List<T> items;
  final String Function(T) itemLabel;
  final String? Function(T)? itemSubtitle;
  final IconData? icon;
  final ValueChanged<T?> onChanged;
  final bool enabled;

  const FieldOptimizedSelector({
    Key? key,
    required this.label,
    required this.selectedValue,
    required this.items,
    required this.itemLabel,
    this.itemSubtitle,
    this.icon,
    required this.onChanged,
    this.enabled = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FieldOptimizedCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 22,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: enabled ? Colors.black87 : Colors.grey,
                ),
              ),
              const Spacer(),
              Icon(
                Icons.keyboard_arrow_down,
                color: enabled ? Theme.of(context).colorScheme.primary : Colors.grey,
              ),
            ],
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: enabled ? () => _showSelectionDialog(context) : null,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: enabled ? Colors.grey.shade50 : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: enabled ? Colors.grey.shade300 : Colors.grey.shade200,
                ),
              ),
              child: selectedValue != null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          itemLabel(selectedValue as T),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (itemSubtitle != null)
                          Text(
                            itemSubtitle!(selectedValue as T) ?? '',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade600,
                            ),
                          ),
                      ],
                    )
                  : Text(
                      'Pilih $label',
                      style: TextStyle(
                        fontSize: 16,
                        color: enabled ? Colors.grey.shade500 : Colors.grey.shade400,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _showSelectionDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          children: [
            // Handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'Pilih $label',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),

            // List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  final isSelected = selectedValue == item;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: isSelected ? Theme.of(context).colorScheme.primary.withOpacity(0.1) : null,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: () {
                          onChanged(item);
                          Navigator.of(context).pop();
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Icon(
                                isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                                color: isSelected ? Theme.of(context).colorScheme.primary : Colors.grey,
                                size: 24,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      itemLabel(item),
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                        color: isSelected ? Theme.of(context).colorScheme.primary : null,
                                      ),
                                    ),
                                    if (itemSubtitle != null)
                                      Text(
                                        itemSubtitle!(item) ?? '',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// High contrast text for outdoor visibility
class HighContrastText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;

  const HighContrastText(
    this.text, {
    Key? key,
    this.style,
    this.textAlign,
    this.maxLines,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: textAlign,
      maxLines: maxLines,
      style: (style ?? const TextStyle()).copyWith(
        fontSize: (style?.fontSize ?? 14) >= 14 ? (style?.fontSize ?? 14) : 14,
        fontWeight: FontWeight.w600,
        color: style?.color ?? Colors.black87,
        shadows: [
          Shadow(
            color: Colors.white.withOpacity(0.8),
            offset: const Offset(1, 1),
            blurRadius: 1,
          ),
        ],
      ),
    );
  }
}