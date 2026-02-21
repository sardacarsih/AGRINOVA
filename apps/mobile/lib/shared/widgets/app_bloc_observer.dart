import 'package:bloc/bloc.dart';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

class AppBlocObserver extends BlocObserver {
  final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 2,
      errorMethodCount: 8,
      lineLength: 120,
      colors: true,
      printEmojis: true,
      printTime: true,
    ),
  );

  @override
  void onCreate(BlocBase bloc) {
    super.onCreate(bloc);
    if (kDebugMode) {
      _logger.i('🎯 BLoC Created: ${bloc.runtimeType}');
    }
  }

  @override
  void onEvent(Bloc bloc, Object? event) {
    super.onEvent(bloc, event);
    if (kDebugMode) {
      _logger.d('📢 Event: ${bloc.runtimeType} | $event');
    }
  }

  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    if (kDebugMode) {
      _logger.v('🔄 Transition: ${bloc.runtimeType}\n'
          'Event: ${transition.event}\n'
          'Current: ${transition.currentState}\n'
          'Next: ${transition.nextState}');
    }
  }

  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    if (kDebugMode) {
      _logger.v('📝 Change: ${bloc.runtimeType}\n'
          'Current: ${change.currentState}\n'
          'Next: ${change.nextState}');
    }
  }

  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    if (kDebugMode) {
      _logger.e('❌ Error in ${bloc.runtimeType}', 
        error: error, 
        stackTrace: stackTrace
      );
    }
    super.onError(bloc, error, stackTrace);
  }

  @override
  void onClose(BlocBase bloc) {
    super.onClose(bloc);
    if (kDebugMode) {
      _logger.w('🗑️ BLoC Closed: ${bloc.runtimeType}');
    }
  }
}