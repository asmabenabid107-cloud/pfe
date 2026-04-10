import 'package:flutter/material.dart';
import 'login.dart';

class PendingScreen extends StatelessWidget {
  final String email;
  const PendingScreen({super.key, required this.email});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Validation en attente")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 20),
            const Icon(Icons.hourglass_bottom, size: 64),
            const SizedBox(height: 14),
            Text(
              "Compte en attente de confirmation admin.",
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text("Email: $email", textAlign: TextAlign.center),
            const SizedBox(height: 18),
            const Text(
              "Après approbation, vous recevrez un email. Ensuite connectez-vous.",
              textAlign: TextAlign.center,
            ),
            const Spacer(),
            FilledButton(
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
              child: const Text("Retour login"),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
