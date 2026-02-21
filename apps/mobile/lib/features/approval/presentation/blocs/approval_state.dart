part of 'approval_bloc.dart';

abstract class ApprovalState extends Equatable {
  const ApprovalState();

  @override
  List<Object?> get props => [];
}

class ApprovalInitial extends ApprovalState {}

class ApprovalLoading extends ApprovalState {}

class ApprovalLoaded extends ApprovalState {
  final List<ApprovalItem> approvals;
  final ApprovalStats stats;
  final String activeFilterStatus; // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'

  const ApprovalLoaded({
    required this.approvals,
    required this.stats,
    this.activeFilterStatus = 'PENDING',
  });

  ApprovalLoaded copyWith({
    List<ApprovalItem>? approvals,
    ApprovalStats? stats,
    String? activeFilterStatus,
  }) {
    return ApprovalLoaded(
      approvals: approvals ?? this.approvals,
      stats: stats ?? this.stats,
      activeFilterStatus: activeFilterStatus ?? this.activeFilterStatus,
    );
  }

  @override
  List<Object?> get props => [approvals, stats, activeFilterStatus];
}

class ApprovalError extends ApprovalState {
  final String message;

  const ApprovalError({required this.message});

  @override
  List<Object?> get props => [message];
}

class ApprovalActionLoading extends ApprovalState {
  // We might want to keep the previous loaded state to show the list while acting
  // But standard bloc usually replaces state. 
  // For better UX, maybe we should have `isSubmitting` in `ApprovalLoaded`.
  // But for simplicity let's use a separate state or just handle it via a mixin or overlay.
  // Actually, let's keep it simple: ActionLoading -> ActionSuccess/Failure -> Reload
}

class ApprovalActionSuccess extends ApprovalState {
  final String message;
  const ApprovalActionSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

class ApprovalActionFailure extends ApprovalState {
  final String message;
  const ApprovalActionFailure({required this.message});
  
    @override
  List<Object?> get props => [message];
}
