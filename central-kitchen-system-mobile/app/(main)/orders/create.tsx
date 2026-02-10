import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function OrderCreateScreen() {
  const handleSubmit = () => {
    Alert.alert('Mock action', 'API tạo đơn chưa có trong swagger.');
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tạo đơn hàng</Text>
      <Text style={styles.note}>Dữ liệu mẫu (API chưa có)</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput placeholder="Nhập ghi chú..." style={styles.input} />

        <Text style={styles.label}>Danh sách mặt hàng</Text>
        <TextInput placeholder="Ví dụ: Bột mì - 10kg" style={styles.input} />
      </View>

      <Pressable style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>Gửi đơn</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#FFF4F4',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9B0F0F',
    marginBottom: 6,
  },
  note: {
    fontSize: 12,
    color: '#D91E18',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#8C8C8C',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFD6D6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  primaryButton: {
    backgroundColor: '#D91E18',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
