import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, cardShadowSmall } from '@/constants/theme';
import { useIngredient } from '@/hooks/use-ingredient';
import { useIngredientBatches } from '@/hooks/use-ingredient-batches';
import type { IngredientBatch } from '@/lib/ingredient-batches';

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

    // Chỉ lấy data, bỏ update và remove
    const { item, isLoading, error } = useIngredient(id);
    const { items: batches, isLoading: isBatchesLoading } = useIngredientBatches(id);

    return (
        <ScrollView
            contentContainerStyle={[
                styles.content,
                { paddingTop: insets.top + 20 }
            ]}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.title}>Chi tiết nguyên liệu</Text>
                <Pressable onPress={() => router.back()} style={styles.smallBackButton}>
                    <Text style={styles.smallBackButtonText}>← Quay lại kho</Text>
                </Pressable>
            </View>

            {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {item ? (
                <View style={styles.card}>
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
                </View>
            ) : null}

            <View style={styles.batchSection}>
                <View style={styles.batchHeader}>
                    <Text style={styles.sectionTitle}>Danh sách lô hàng</Text>
                </View>

                {isBatchesLoading ? (
                    <ActivityIndicator color="#D91E18" />
                ) : batches.length > 0 ? (
                    batches.map((batch: IngredientBatch) => (
                        <Pressable
                            key={batch._id}
                            style={[styles.batchCard, batch.isExpired && styles.batchExpired]}
                            // Chuyển sang trang xem chi tiết lô hàng
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
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { flexGrow: 1, padding: 20, backgroundColor: '#FFF4F4', paddingBottom: 40 },
    headerContainer: { marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700', color: '#9B0F0F' },
    smallBackButton: { marginTop: 8, alignSelf: 'flex-start' },
    smallBackButtonText: { color: '#8C8C8C', fontSize: 13, fontWeight: '500' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#FFE1E1', ...cardShadow, elevation: 2, marginBottom: 20 },
    row: { marginBottom: 12 },
    label: { fontSize: 12, color: '#8C8C8C', marginBottom: 4 },
    value: { fontSize: 14, fontWeight: '600', color: '#2A2A2A' },
    totalStockText: { color: '#D91E18', fontSize: 16 },
    batchSection: { marginBottom: 10 },
    batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#9B0F0F' },
    batchCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#FFE1E1', ...cardShadowSmall },
    batchExpired: { borderColor: '#D91E18', backgroundColor: '#FFF0F0' },
    batchInfo: { flex: 1 },
    batchCode: { fontSize: 14, fontWeight: '700', color: '#2A2A2A' },
    batchDate: { fontSize: 12, color: '#8C8C8C', marginTop: 2 },
    batchQuantity: { alignItems: 'flex-end' },
    quantityValue: { fontSize: 15, fontWeight: '700', color: '#D91E18' },
    unitText: { fontSize: 10, color: '#8C8C8C' },
    emptyText: { textAlign: 'center', color: '#8C8C8C', fontStyle: 'italic', marginTop: 20 },
    error: { color: '#D91E18', fontSize: 12, marginBottom: 8 },
});