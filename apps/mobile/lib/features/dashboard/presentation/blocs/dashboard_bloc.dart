import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/repositories/dashboard_repository.dart';
import '../../../../core/services/graphql_sync_service.dart';

abstract class DashboardEvent {}

abstract class DashboardState {}

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final DashboardRepository dashboardRepository;
  final GraphQLSyncService syncService;

  DashboardBloc({
    required this.dashboardRepository,
    required this.syncService,
  }) : super(DashboardInitial()) {
    // TODO: implement event handlers
  }
}

class DashboardInitial extends DashboardState {}
