import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/auth_bloc.dart';

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _logoutOtherDevices = false;
  bool _isSubmitting = false;
  bool _waitingBlocResult = false;
  DateTime? _lastHandledPasswordChangeAt;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _waitingBlocResult = true;
    });

    context.read<AuthBloc>().add(
          AuthPasswordChangeRequested(
            currentPassword: _currentPasswordController.text,
            newPassword: _newPasswordController.text,
            logoutOtherDevices: _logoutOtherDevices,
          ),
        );
  }

  void _handleAuthState(BuildContext context, AuthState state) {
    if (!_waitingBlocResult || state is! AuthAuthenticated) {
      return;
    }

    final latestChangeAt = state.lastPasswordChangedAt;
    final errorMessage = state.passwordChangeErrorMessage;

    if (errorMessage != null && errorMessage.isNotEmpty) {
      setState(() {
        _isSubmitting = false;
        _waitingBlocResult = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Colors.red.shade700,
        ),
      );
      return;
    }

    if (latestChangeAt != null &&
        latestChangeAt != _lastHandledPasswordChangeAt) {
      _lastHandledPasswordChangeAt = latestChangeAt;
      setState(() {
        _isSubmitting = false;
        _waitingBlocResult = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password berhasil diubah.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop(true);
    }
  }

  String? _validateCurrentPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password saat ini wajib diisi';
    }
    return null;
  }

  String? _validateNewPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password baru wajib diisi';
    }
    if (value.length < 8) {
      return 'Password baru minimal 8 karakter';
    }
    if (value == _currentPasswordController.text) {
      return 'Password baru harus berbeda dari password saat ini';
    }
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Konfirmasi password wajib diisi';
    }
    if (value != _newPasswordController.text) {
      return 'Konfirmasi password tidak sama';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: _handleAuthState,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Ubah Password'),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Perbarui password akun Anda untuk menjaga keamanan akses.',
                  ),
                  const SizedBox(height: 16),
                  _buildPasswordField(
                    controller: _currentPasswordController,
                    label: 'Password Saat Ini',
                    obscure: _obscureCurrent,
                    onToggle: () =>
                        setState(() => _obscureCurrent = !_obscureCurrent),
                    validator: _validateCurrentPassword,
                  ),
                  const SizedBox(height: 12),
                  _buildPasswordField(
                    controller: _newPasswordController,
                    label: 'Password Baru',
                    obscure: _obscureNew,
                    onToggle: () => setState(() => _obscureNew = !_obscureNew),
                    validator: _validateNewPassword,
                  ),
                  const SizedBox(height: 12),
                  _buildPasswordField(
                    controller: _confirmPasswordController,
                    label: 'Konfirmasi Password Baru',
                    obscure: _obscureConfirm,
                    onToggle: () =>
                        setState(() => _obscureConfirm = !_obscureConfirm),
                    validator: _validateConfirmPassword,
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Logout perangkat lain'),
                    subtitle: const Text(
                      'Keluar dari sesi akun ini di perangkat lain',
                    ),
                    value: _logoutOtherDevices,
                    onChanged: _isSubmitting
                        ? null
                        : (value) =>
                            setState(() => _logoutOtherDevices = value),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Simpan Password Baru'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool obscure,
    required VoidCallback onToggle,
    required String? Function(String?) validator,
  }) {
    return TextFormField(
      controller: controller,
      validator: validator,
      obscureText: obscure,
      enableSuggestions: false,
      autocorrect: false,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        suffixIcon: IconButton(
          onPressed: onToggle,
          icon: Icon(obscure ? Icons.visibility : Icons.visibility_off),
        ),
      ),
    );
  }
}
