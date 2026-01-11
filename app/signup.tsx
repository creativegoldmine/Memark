import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorMessage } from '@/components/ErrorMessage';
import { validateEmail, validatePassword, validatePhoneNumber, validateName, normalizePhoneNumber } from '@/utils/validators';

export default function Signup() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid name');
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email');
      return;
    }

    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Invalid phone number');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Invalid password');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber.trim());
      const { error: signUpError } = await signUp(
        email.toLowerCase().trim(),
        password,
        name.trim(),
        normalizedPhone
      );

      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
        } else if (signUpError.message?.includes('Invalid email')) {
          setError('Please enter a valid email address.');
        } else if (signUpError.message?.includes('password')) {
          setError('Password must be at least 6 characters long.');
        } else if (signUpError.message?.includes('network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(signUpError.message || 'Failed to create account. Please try again.');
        }
      } else {
        setTimeout(() => {
          router.replace('/onboarding');
        }, 500);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Start organizing your digital life
        </Text>

        <ErrorMessage message={error} visible={!!error} />

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="John Doe"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="john@example.com"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
            <Text style={[styles.hint, { color: theme.textTertiary }]}>Required for SMS integration</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="+1 555 123 4567"
              placeholderTextColor={theme.textTertiary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor={theme.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Continue'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Already have an account?{' '}
              <Text
                style={[styles.link, { color: theme.primary }]}
                onPress={() => router.push('/login')}
              >
                Sign In
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: -4,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontWeight: '600',
  },
});
