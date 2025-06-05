import { supabase } from '@/lib/supabase';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const handleNextStep = () => {
    if (!email || !password || !confirmPassword || !name) {
      Alert.alert('Error', 'Por favor rellena todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setStep(2);
  };

  const handleRegister = async () => {
    if (!username) {
      Alert.alert('Error', 'Por favor ingresa un nombre de usuario');
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
      .insert({ id: data.user.id, name: username, full_name: name });

    if (profileError) {
      Alert.alert('Error al guardar el perfil', profileError.message);
      return;
    }

    Alert.alert('Registrado', 'Ya puedes iniciar sesión');
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>Join the community 🌍</Text>

        {step === 1 ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#888"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#888"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Repite la contraseña"
              placeholderTextColor="#888"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity style={styles.registerButton} onPress={handleNextStep}>
              <Text style={styles.registerButtonText}>Siguiente</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nombre de usuario"
              placeholderTextColor="#888"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>Sign up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
              <Text style={styles.backButtonText}>Atrás</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <Link href="/login" style={styles.loginLink}>
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={styles.loginNow}>Login</Text>
          </Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 18,
    color: '#333',
    marginBottom: 32,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  registerButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginBottom: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    marginHorizontal: 12,
    color: '#666',
  },
  loginLink: {
    alignSelf: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginNow: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
});

