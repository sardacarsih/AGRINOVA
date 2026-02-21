part of 'approval_bloc.dart';

abstract class ApprovalEvent extends Equatable {
  const ApprovalEvent();

  @override
  List<Object?> get props => [];
}

class ApprovalLoadRequested extends ApprovalEvent {
  final String? status;
  final String? divisionId;
  final String? search;

  const ApprovalLoadRequested({this.status, this.divisionId, this.search});

  @override
  List<Object?> get props => [status, divisionId, search];
}

class ApprovalRefreshRequested extends ApprovalEvent {
  const ApprovalRefreshRequested();
}

class ApprovalApproveRequested extends ApprovalEvent {
  final String id;
  final String? notes;

  const ApprovalApproveRequested({required this.id, this.notes});

  @override
  List<Object?> get props => [id, notes];
}

class ApprovalRejectRequested extends ApprovalEvent {
  final String id;
  final String reason;

  const ApprovalRejectRequested({required this.id, required this.reason});

  @override
  List<Object?> get props => [id, reason];
}
