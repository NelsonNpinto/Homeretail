import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Colors, Shadows } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.appName}>ATTENDANCE</Text>
        <Text style={styles.tagline}>Workplace presence, simplified</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Sign In</Text>
        <Text style={styles.subheading}>Enter your credentials to continue</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor={Colors.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.textWhite} /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Create one</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.pageBg },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  topSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: Colors.textWhite, letterSpacing: 1 },
  appName: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 4, marginBottom: 4 },
  tagline: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 24, padding: 28,
    ...Shadows.card,
  },
  heading: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  subheading: { fontSize: 13, color: Colors.textMuted, marginBottom: 24 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: 14, padding: 14,
    fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  inputFlex: { flex: 1, padding: 14, fontSize: 15, color: Colors.textPrimary },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  button: {
    backgroundColor: Colors.primary, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  buttonText: { color: Colors.textWhite, fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', fontSize: 14, color: Colors.textMuted },
  linkBold: { color: Colors.primary, fontWeight: '700' },
});
