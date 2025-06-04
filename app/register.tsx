import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput } from 'react-native';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Por favor rellena todos los campos');
      return;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', username)
      .maybeSingle();

    if (existing) {
      Alert.alert('Error', 'Nombre de usuario ya en uso');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      Alert.alert('Error al registrarse', error?.message || '');
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, name: username });

    if (profileError) {
      Alert.alert('Error al guardar el perfil', profileError.message);
      return;
    }

    Alert.alert('Registrado', 'Ya puedes iniciar sesión');
    router.replace('/login');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Crea tu cuenta
      </ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Nombre de usuario"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <Button title="Registrarse" onPress={handleRegister} />
      <Link href="/login" style={styles.loginLink}>
        <ThemedText type="link">Iniciar sesión</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { marginBottom: 24, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  loginLink: {
    marginTop: 12,
    alignSelf: 'center',
  },
});
