import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeliveryTrips } from "@/hooks/use-delivery-trips";
import type { DeliveryTrip, TripStatus } from "@/lib/trips";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_OPTIONS: { value: "" | TripStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "Planning", label: "Planning" },
  { value: "In_Transit", label: "In Transit" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

function tripCode(trip: DeliveryTrip): string {
  return trip.tripCode ?? trip.tripNumber ?? `TRIP-${trip._id.slice(-6).toUpperCase()}`;
}

function vehicleName(trip: DeliveryTrip): string {
  const vehicle = trip.vehicleType ?? trip.vehicleTypeId;
  if (!vehicle) return "—";
  if (typeof vehicle === "string") return vehicle;
  return vehicle.name ?? vehicle._id;
}

export default function KitchenHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"" | TripStatus>("");
  const { trips, isLoading, error, refetch } = useDeliveryTrips({
    status: statusFilter || undefined,
  });
  const safeTrips = Array.isArray(trips) ? trips : [];

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Kế hoạch vận chuyển</Text>
        <Pressable style={styles.refreshBtn} onPress={refetch}>
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.filterChip,
              statusFilter === opt.value && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(opt.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === opt.value && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#D91E18" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : safeTrips.length === 0 ? (
        <Text style={styles.empty}>Chưa có kế hoạch vận chuyển.</Text>
      ) : (
        safeTrips.map((trip) => (
          <Pressable
            key={trip._id}
            style={styles.card}
            onPress={() => router.push(`/trips/${trip._id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardCode}>{tripCode(trip)}</Text>
              <Text style={styles.cardDate}>
                {formatDate(trip.createdAt)}
              </Text>
            </View>
            <Text style={styles.cardProducts} numberOfLines={2}>
              {trip.notes?.trim() || "Không có ghi chú"}
            </Text>
            <Text style={styles.cardMeta}>
              Trạng thái: {trip.status} • Xe: {vehicleName(trip)}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#FFF4F4",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: "#9B0F0F",
    fontWeight: "600",
    fontSize: 13,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  filterChipActive: {
    backgroundColor: "#D91E18",
    borderColor: "#D91E18",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9B0F0F",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  loader: { marginVertical: 24 },
  error: {
    color: "#D91E18",
    fontSize: 14,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardCode: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  cardDate: {
    fontSize: 13,
    color: "#666",
  },
  cardProducts: {
    fontSize: 13,
    color: "#2A2A2A",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#8C8C8C",
  },
});
