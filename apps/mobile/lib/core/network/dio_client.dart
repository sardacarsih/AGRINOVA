import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../constants/api_constants.dart';

/// Minimal Dio client for REST API calls
class DioClient {
  late final Dio _dio;
  final Logger _logger = Logger();

  DioClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
    
    // Add interceptors for logging
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          _logger.d('Dio Request: ${options.method} ${options.uri}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          _logger.d('Dio Response: ${response.statusCode} ${response.requestOptions.uri}');
          return handler.next(response);
        },
        onError: (DioException error, handler) {
          _logger.e('Dio Error: ${error.message} ${error.requestOptions.uri}');
          return handler.next(error);
        },
      ),
    );
  }

  Dio get dio => _dio;

  /// Refresh configuration with new base URL
  Future<void> refreshConfiguration() async {
    _dio.options.baseUrl = ApiConstants.baseUrl;
    _logger.i('DioClient configuration refreshed with base URL: ${_dio.options.baseUrl}');
  }
}