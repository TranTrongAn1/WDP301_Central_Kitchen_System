import { useRouter } from "expo-router";
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
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useNotification } from "@/context/notification-context";
import { useAuth } from "@/hooks/use-auth";
import { logisticsOrdersApi } from "@/lib/api";

export default function CreateOrderScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { token, user } = useAuth();
    const { showToast } = useNotification();

    const [requestedDeliveryDate, setRequestedDeliveryDate] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!requestedDeliveryDate) {
            showToast("Vui lòng nhập ngày giao hàng.", "error");
            return;
        }

        if (!user?.storeId) {
            showToast("Không tìm thấy cửa hàng của bạn.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            // For now, create a basic order with minimal items
            // Full product selection UI can be added later
            const payload = {
                storeId: user.storeId,
                requestedDeliveryDate,
                recipientName: recipientName || undefined,
                recipientPhone: recipientPhone || undefined,
                address: address || undefined,
                notes: notes || undefined,
                items: [], // To be populated by product selection
                paymentMethod: "Cash" as const,
            };

            await logisticsOrdersApi.create(payload, token);
            showToast("Tạo đơn hàng thành công.");
            router.back();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Không thể tạo đơn hàng.";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
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
                        <Text style={styles.backText}>‹ Quay lại</Text>
                    </Pressable>
                </View>
                <Text style={styles.title}>Tạo đơn hàng</Text>

                <View style={[styles.card, cardShadowSmall]}>
                    <Text style={styles.label}>Ngày giao hàng (YYYY-MM-DD) *</Text>
                    <TextInput
                        value={requestedDeliveryDate}
                        onChangeText={setRequestedDeliveryDate}
                        placeholder="2026-03-15"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Tên người nhận</Text>
                    <TextInput
                        value={recipientName}
                        onChangeText={setRecipientName}
                        placeholder="Nhập tên"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Số điện thoại</Text>
                    <TextInput
                        value={recipientPhone}
                        onChangeText={setRecipientPhone}
                        placeholder="Nhập số điện thoại"
                        keyboardType="phone-pad"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Địa chỉ</Text>
                    <TextInput
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Nhập địa chỉ"
                        multiline
                        numberOfLines={3}
                        style={[styles.input, styles.multilineInput]}
                    />

                    <Text style={styles.label}>Ghi chú</Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Thêm ghi chú nếu cần"
                        multiline
                        numberOfLines={3}
                        style={[styles.input, styles.multilineInput]}
                    />
                </View>

                <Pressable
                    style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Tạo đơn</Text>
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
        padding: 16,
        paddingBottom: 32,
    },
    header: {
        marginBottom: 16,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    backText: {
        color: "#D91E18",
        fontSize: 16,
        fontWeight: "600",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#9B0F0F",
        marginBottom: 20,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#FFE1E1",
        marginBottom: 20,
        elevation: 2,
    },
    label: {
        fontSize: 12,
        color: "#8C8C8C",
        marginBottom: 6,
        fontWeight: "600",
    },
    input: {
        borderWidth: 1,
        borderColor: "#FFD6D6",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        backgroundColor: "#FFF",
        fontSize: 14,
    },
    multilineInput: {
        textAlignVertical: "top",
        paddingTop: 10,
    },
    primaryButton: {
        backgroundColor: "#D91E18",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        marginBottom: 16,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 14,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
