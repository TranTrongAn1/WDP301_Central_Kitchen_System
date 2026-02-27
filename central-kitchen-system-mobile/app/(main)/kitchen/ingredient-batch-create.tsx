import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useNotification } from "@/context/notification-context";
import { ingredientBatchesApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

export default function IngredientBatchCreateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ingredientId, name } = useLocalSearchParams<{
    ingredientId?: string;
    name?: string;
  }>();
  const { token } = useAuth();
  const { showToast } = useNotification();
  const [supplierId, setSupplierId] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!ingredientId) {
      showToast("Thiếu ID nguyên liệu.", "error");
      return;
    }
    if (!supplierId || !batchCode || !initialQuantity || !price || !expiryDate) {
      showToast("Vui lòng nhập đầy đủ thông tin bắt buộc.", "error");
      return;
    }
    const qty = Number(initialQuantity);
    const p = Number(price);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast("Số lượng nhập phải lớn hơn 0.", "error");
      return;
    }
    if (!Number.isFinite(p) || p <= 0) {
      showToast("Giá nhập phải lớn hơn 0.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await ingredientBatchesApi.createForIngredient(
        ingredientId,
        {
          supplierId,
          batchCode,
          initialQuantity: qty,
          price: p,
          expiryDate,
          receivedDate: receivedDate || undefined,
        },
        token,
      );
      showToast("Tạo lô nguyên liệu thành công.");
      router.back();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Không thể tạo lô nguyên liệu.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16 + insets.top },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Lô nguyên liệu</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>
          Tạo lô mới
          {name ? ` - ${name}` : ""}
        </Text>

        <View style={[styles.card, cardShadowSmall]}>
          <Text style={styles.label}>Nhà cung cấp (ID)</Text>
          <TextInput
            value={supplierId}
            onChangeText={setSupplierId}
            placeholder="Nhập supplierId"
            style={styles.input}
          />

          <Text style={styles.label}>Mã lô</Text>
          <TextInput
            value={batchCode}
            onChangeText={setBatchCode}
            placeholder="Ví dụ: IB-FLOUR-20260129-001"
            autoCapitalize="characters"
            style={styles.input}
          />

          <Text style={styles.label}>Số lượng nhập</Text>
          <TextInput
            value={initialQuantity}
            onChangeText={setInitialQuantity}
            keyboardType="numeric"
            placeholder="Ví dụ: 500"
            style={styles.input}
          />

          <Text style={styles.label}>Giá nhập (VND / đơn vị)</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="Ví dụ: 25000"
            style={styles.input}
          />

          <Text style={styles.label}>Hạn sử dụng (YYYY-MM-DD)</Text>
          <TextInput
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="2026-12-31"
            style={styles.input}
          />

          <Text style={styles.label}>Ngày nhận (YYYY-MM-DD, optional)</Text>
          <TextInput
            value={receivedDate}
            onChangeText={setReceivedDate}
            placeholder="2026-01-29"
            style={styles.input}
          />
        </View>

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Lưu lô mới</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF4F4",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    color: "#9B0F0F",
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE1E1",
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#8C8C8C",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: "#FFF",
    color: "#1C1C1C",
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: "#D91E18",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

