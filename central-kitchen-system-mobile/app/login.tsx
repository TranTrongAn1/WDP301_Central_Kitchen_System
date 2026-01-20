import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isSubmitting || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Central Kitchen System</Text>
          <Text style={styles.subtitle}>Đăng nhập dành cho Store/Kitchen Staff</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Nhập tài khoản"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            disabled={disabled}
            style={({ pressed }) => [
              styles.button,
              disabled && styles.buttonDisabled,
              pressed && !disabled && styles.buttonPressed,
            ]}
            onPress={handleSubmit}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            Chỉ role StoreStaff và KitchenStaff được phép đăng nhập trên mobile.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF4F4',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#9B0F0F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6E6E6E',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    shadowColor: '#B40000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9B0F0F',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFD6D6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#FFF',
    color: '#1C1C1C',
  },
  button: {
    backgroundColor: '#D91E18',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: '#D98E8B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    color: '#6E6E6E',
    textAlign: 'center',
  },
});
