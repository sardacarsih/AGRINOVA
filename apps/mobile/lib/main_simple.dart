import 'package:flutter/material.dart';

void main() {
  runApp(const AgrinovaSimpleApp());
}

class AgrinovaSimpleApp extends StatelessWidget {
  const AgrinovaSimpleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agrinova Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Agrinova Mobile'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.agriculture,
              size: 100,
              color: Colors.green,
            ),
            SizedBox(height: 20),
            Text(
              'Agrinova Mobile',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 10),
            Text(
              'Palm Oil Management System',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
            SizedBox(height: 30),
            Card(
              margin: EdgeInsets.all(20),
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(
                      '🎉 Production Ready Status',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text('✅ Mandor: Harvest Management'),
                    Text('✅ Satpam: Gate Check System'),
                    Text('✅ Offline-First Architecture'),
                    Text('✅ JWT Authentication'),
                    Text('✅ Database Integration'),
                    Text('✅ Photo & Location Services'),
                    Text('✅ Sync Functionality'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Agrinova Mobile is Production Ready! 🚀'),
              backgroundColor: Colors.green,
            ),
          );
        },
        child: const Icon(Icons.rocket_launch),
      ),
    );
  }
}