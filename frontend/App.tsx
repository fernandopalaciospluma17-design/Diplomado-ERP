import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function App() {
  const [status, setStatus] = useState('Comprobando API...');

  const checkApi = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/health`);
      setStatus(response.ok ? 'API operativa' : 'API con errores');
    } catch {
      setStatus('API no disponible');
    }
  };

  useEffect(() => { void checkApi(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CENTRO DE OPERACIONES</Text>
      <Text style={styles.title}>ERP</Text>
      <Text style={styles.subtitle}>Inventario, ventas y compras en un solo lugar.</Text>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Estado del servicio</Text>
        <Text style={styles.status}>{status}</Text>
      </View>
      <Pressable onPress={() => void checkApi()} style={styles.button}>
        <Text style={styles.buttonText}>Actualizar estado</Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f4f1ea',
    flex: 1,
    justifyContent: 'center',
    padding: 32
  },
  eyebrow: {
    color: '#a14f32',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12
  },
  title: {
    color: '#1d2825',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center'
  },
  subtitle: {
    color: '#55645e',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center'
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e1dc',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 28,
    padding: 20,
    width: '100%'
  },
  statusLabel: { color: '#697871', fontSize: 13, fontWeight: '600' },
  status: { color: '#1d2825', fontSize: 20, fontWeight: '700', marginTop: 8 },
  button: { backgroundColor: '#a14f32', borderRadius: 6, marginTop: 16, paddingHorizontal: 20, paddingVertical: 13 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '700'
  }
});