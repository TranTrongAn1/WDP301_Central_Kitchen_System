import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, cardShadowSmall } from '@/constants/theme';
import { useIngredient } from '@/hooks/use-ingredient';
import { useIngredientBatches } from '@/hooks/use-ingredient-batches';
import type { IngredientBatch } from '@/lib/ingredient-batches';
import type { Ingredient } from '@/lib/ingredients';

const formatValue = (value: number | string | null | undefined) =>
    value === null || value === undefined ? '--' : String(value);

const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('vi-VN');
};

export default function IngredientDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();


    const { item, isLoading, error, update, remove } = useIngredient(id);
    const { items: batches, isLoading: isBatchesLoading } = useIngredientBatches(id);

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<Partial<Ingredient>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const merged = useMemo(() => ({ ...(item ?? {}), ...form }), [form, item]);

    const startEdit = () => {
        if (item) {
            setForm({
                name: item.name ?? item.ingredientName,
                unit: item.unit,
                costPrice: item.costPrice,
                warningThreshold: item.warningThreshold,
                ingredientName: item.ingredientName ?? item.name,
            });
        }
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            await update({
                ...form,
                name: form.name ?? form.ingredientName,
                ingredientName: form.ingredientName ?? form.name,
            });
            setIsEditing(false);
            setForm({});
        } catch (err) {
            Alert.alert('Cập nhật thất bại', err instanceof Error ? err.message : 'Có lỗi xảy ra.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Xóa nguyên liệu', 'Bạn chắc chắn muốn xóa?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    if (!id) return;
                    setIsSubmitting(true);
                    try {
                        await remove();
                        router.replace('/inventory');
                    } catch (err) {
                        Alert.alert('Xóa thất bại', err instanceof Error ? err.message : 'Có lỗi xảy ra.');
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            },
        ]);
    };

    return (
        <ScrollView
            contentContainerStyle={[
                styles.content,
                { paddingTop: insets.top + 20 }
            ]}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.title}>Chi tiết nguyên liệu</Text>
                {!isEditing && (
                    <Pressable onPress={() => router.back()} style={styles.smallBackButton}>
                        <Text style={styles.smallBackButtonText}>← Quay lại kho</Text>
                    </Pressable>
                )}
            </View>

            {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {item ? (
                <View style={styles.card}>
                    {isEditing ? (
                        <>
                            <Text style={styles.label}>Tên</Text>
                            <TextInput
                                value={merged.name ?? ''}
                                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                                style={styles.input}
                            />
                            <Text style={styles.label}>Đơn vị</Text>
                            <TextInput
                                value={merged.unit ?? ''}
                                onChangeText={(value) => setForm((prev) => ({ ...prev, unit: value }))}
                                style={styles.input}
                            />
                            <Text style={styles.label}>Giá vốn</Text>
                            <TextInput
                                value={merged.costPrice !== undefined ? String(merged.costPrice) : ''}
                                onChangeText={(value) => setForm((prev) => ({ ...prev, costPrice: Number(value) || 0 }))}
                                keyboardType="decimal-pad"
                                placeholder="Ví dụ: 25000 hoặc 25000.5"
                                style={styles.input}
                            />
                        </>
                    ) : (
                        <>
                            <View style={styles.row}>
                                <Text style={styles.label}>Tên</Text>
                                <Text style={styles.value}>{formatValue(item.name ?? item.ingredientName)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Giá vốn</Text>
                                <Text style={styles.value}>
                                    {typeof item.costPrice === 'number'
                                        ? `${item.costPrice.toLocaleString('vi-VN')} đ`
                                        : formatValue(item.costPrice)}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Tồn kho tổng</Text>
                                <Text style={[styles.value, styles.totalStockText]}>
                                    {Number(item.totalQuantity || 0).toFixed(2)} {item.unit}
                                </Text>
                            </View>

                        </>
                    )}
                </View>
            ) : null}

            {!isEditing && (
                <View style={styles.batchSection}>
                    <View style={styles.batchHeader}>
                        <Text style={styles.sectionTitle}>Danh sách lô hàng</Text>
                        <Pressable
                            style={styles.addButton}
                            onPress={() => router.push({ pathname: "/ingredient/[id]/batches/create", params: { id } } as any)}
                        >
                            <Text style={styles.addButtonText}>+ Nhập lô mới</Text>
                        </Pressable>
                    </View>

                    {isBatchesLoading ? (
                        <ActivityIndicator color="#D91E18" />
                    ) : batches.length > 0 ? (
                        batches.map((batch: IngredientBatch) => (
                            <Pressable
                                key={batch._id}
                                style={[styles.batchCard, batch.isExpired && styles.batchExpired]}
                                // Đã sửa đường dẫn khớp với cấu trúc kitchen/batch/[id]
                                onPress={() => router.push(`/kitchen/batch/${batch._id}` as any)}
                            >
                                <View style={styles.batchInfo}>
                                    <Text style={styles.batchCode}>{batch.batchCode}</Text>
                                    <Text style={styles.batchDate}>HSD: {formatDate(batch.expiryDate)}</Text>
                                </View>
                                <View style={styles.batchQuantity}>
                                    <Text style={styles.quantityValue}>{Number(batch.currentQuantity).toFixed(2)}</Text>
                                    <Text style={styles.unitText}>{item?.unit}</Text>
                                </View>
                            </Pressable>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Chưa có lô hàng nào.</Text>
                    )}
                </View>
            )}
            <View style={styles.buttonRow}>
                <Pressable
                    onPress={isEditing ? handleSave : startEdit}
                    style={[styles.flexButton, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                    disabled={isSubmitting}
                >
                    <Text style={styles.primaryButtonText}>{isEditing ? 'Lưu' : 'Cập nhật'}</Text>
                </Pressable>

                <Pressable
                    onPress={isEditing ? () => setIsEditing(false) : handleDelete}
                    style={[styles.flexButton, isEditing ? styles.secondaryButton : styles.dangerButton]}
                >
                    <Text style={isEditing ? styles.secondaryButtonText : styles.dangerButtonText}>
                        {isEditing ? 'Hủy' : 'Xóa'}
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { flexGrow: 1, padding: 20, backgroundColor: '#FFF4F4' },
    headerContainer: { marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700', color: '#9B0F0F' },
    smallBackButton: { marginTop: 8, alignSelf: 'flex-start' },
    smallBackButtonText: { color: '#8C8C8C', fontSize: 13, fontWeight: '500' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#FFE1E1', ...cardShadow, elevation: 2, marginBottom: 20 },
    row: { marginBottom: 12 },
    label: { fontSize: 12, color: '#8C8C8C', marginBottom: 4 },
    value: { fontSize: 14, fontWeight: '600', color: '#2A2A2A' },
    totalStockText: { color: '#D91E18', fontSize: 16 },
    input: { borderWidth: 1, borderColor: '#FFD6D6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, backgroundColor: '#FFF' },
    batchSection: { marginBottom: 10 },
    batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#9B0F0F' },
    addButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D91E18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    addButtonText: { color: '#D91E18', fontSize: 12, fontWeight: '600' },
    batchCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#FFE1E1', ...cardShadowSmall },
    batchExpired: { borderColor: '#D91E18', backgroundColor: '#FFF0F0' },
    batchInfo: { flex: 1 },
    batchCode: { fontSize: 14, fontWeight: '700', color: '#2A2A2A' },
    batchDate: { fontSize: 12, color: '#8C8C8C', marginTop: 2 },
    batchQuantity: { alignItems: 'flex-end' },
    quantityValue: { fontSize: 15, fontWeight: '700', color: '#D91E18' },
    unitText: { fontSize: 10, color: '#8C8C8C' },
    emptyText: { textAlign: 'center', color: '#8C8C8C', fontStyle: 'italic' },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 30, marginBottom: 40 },
    flexButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    primaryButton: { backgroundColor: '#D91E18' },
    secondaryButton: { borderWidth: 1, borderColor: '#FFD6D6', backgroundColor: '#FFF' },
    dangerButton: { backgroundColor: '#B40000' },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
    secondaryButtonText: { color: '#9B0F0F', fontWeight: '600' },
    dangerButtonText: { color: '#FFFFFF', fontWeight: '700' },
    buttonDisabled: { opacity: 0.6 },
    error: { color: '#D91E18', fontSize: 12, marginBottom: 8 },
});