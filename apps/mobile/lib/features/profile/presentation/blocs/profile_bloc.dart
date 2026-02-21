import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/repositories/profile_repository.dart';

abstract class ProfileEvent {}

abstract class ProfileState {}

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRepository profileRepository;

  ProfileBloc({
    required this.profileRepository,
  }) : super(ProfileInitial()) {
    // TODO: implement event handlers
  }
}

class ProfileInitial extends ProfileState {}
