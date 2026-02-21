# Project Overview

This is a Flutter-based mobile application for Agrinova Palm Oil Management. It is designed to be used by various roles within the company, including Mandor, Asisten, Manager, Area Manager, Satpam, Company Admin, and Super Admin. The application supports JWT authentication, offline-first functionality with a local SQLite database, and features for harvesting, gate checks, monitoring, and approvals.

## Main Technologies

*   **Framework:** Flutter (>=3.10.0)
*   **State Management:** BLoC
*   **Dependency Injection:** get_it
*   **Navigation:** go_router
*   **Authentication:** JWT, Biometrics (local_auth)
*   **Database:** SQLite (sqflite) for offline storage, Hive for general storage
*   **API Communication:** Dio, Retrofit
*   **Notifications:** Firebase Cloud Messaging, flutter_local_notifications
*   **Other Key Libraries:**
    *   `permission_handler` for managing device permissions
    *   `camera` and `image_picker` for image capture
    *   `geolocator` for location services
    *   `fl_chart` and `syncfusion_flutter_charts` for data visualization

## Architecture

The application follows a clean architecture pattern, with a clear separation of concerns between the presentation, data, and domain layers.

*   **`lib/features`**: Contains the different modules of the application, such as `auth`, `dashboard`, `harvest`, `gate_check`, `monitoring`, and `approval`. Each feature is self-contained with its own BLoC, repository, and data sources.
*   **`lib/core`**: Contains the core components of the application, such as configuration, dependency injection, routing, services, and theme.
*   **`lib/shared`**: Contains shared widgets and utilities that are used across multiple features.

# Building and Running

## Prerequisites

*   Flutter SDK (>=3.10.0)
*   Dart SDK (>=3.0.0 <4.0.0)

## Installation

1.  Clone the repository.
2.  Run `flutter pub get` to install the dependencies.

## Running the App

*   **Debug:** `flutter run`
*   **Release:** `flutter run --release`

## Building the App

*   **Android:** `flutter build apk --release` or `flutter build appbundle --release`
*   **iOS:** `flutter build ios --release`

# Development Conventions

## Code Generation

This project uses code generation for several tasks, including:

*   **JSON Serialization:** `json_serializable`
*   **API Client:** `retrofit_generator`
*   **Database:** `hive_generator`

To run the code generator, use the following command:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

## State Management

The application uses the BLoC (Business Logic Component) pattern for state management. BLoCs are responsible for managing the state of a feature and handling business logic. They are injected into the widget tree using `BlocProvider`.

## Dependency Injection

The application uses the `get_it` package for dependency injection. All services, repositories, and BLoCs are registered in the `lib/core/di/dependency_injection.dart` file.

## Routing

The application uses the `go_router` package for navigation. All routes are defined in the `lib/core/routes/app_routes.dart` file.

## Testing

The project includes unit and widget tests. To run the tests, use the following command:

```bash
flutter test
```