import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logoImage} />
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>KINH DO</Text>
          </View>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brandTitle}>Kinh Do Central Kitchen</Text>
          <Text style={styles.brandSubTitle}>Dat banh cho cua hang</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          placeholder="Tim banh, ma san pham..."
          placeholderTextColor="#9A9A9A"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.banner}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Danh sach cac loai banh</Text>
          <Text style={styles.bannerSubTitle}>Dat tu bep trung tam, giao hang moi ngay</Text>
        </View>
        <View style={styles.bannerTag}>
          <Text style={styles.bannerTagText}>Moi</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Loai banh pho bien</Text>
        <Text style={styles.sectionAction}>Xem tat ca</Text>
      </View>

      <View style={styles.categoryRow}>
        {['Banh mi', 'Banh kem', 'Banh trung thu', 'Banh quy'].map((item) => (
          <View key={item} style={styles.categoryPill}>
            <Text style={styles.categoryText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.list}>
        {[
          {
            name: 'Banh mi baguette',
            code: 'BK-101',
            price: '12,000 VND',
            stock: 'Con 240',
          },
          {
            name: 'Banh kem socola',
            code: 'BK-204',
            price: '220,000 VND',
            stock: 'Con 36',
          },
          {
            name: 'Banh trung thu thap cam',
            code: 'BK-330',
            price: '95,000 VND',
            stock: 'Con 120',
          },
          {
            name: 'Banh quy bo',
            code: 'BK-412',
            price: '35,000 VND',
            stock: 'Con 80',
          },
        ].map((item) => (
          <View key={item.code} style={styles.card}>
            <View style={styles.cardImage}>
              <Text style={styles.cardImageText}>K</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.code}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardPrice}>{item.price}</Text>
                <Text style={styles.cardStock}>{item.stock}</Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Dat</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF4F4',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    shadowColor: '#B40000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  logoWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logoImage: {
    width: 40,
    height: 40,
    opacity: 0.9,
  },
  logoBadge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#D91E18',
    borderRadius: 10,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headerText: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9B0F0F',
    marginBottom: 4,
  },
  brandSubTitle: {
    fontSize: 13,
    color: '#6E6E6E',
  },
  searchSection: {
    marginTop: 16,
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FFD6D6',
    color: '#1C1C1C',
  },
  banner: {
    backgroundColor: '#D91E18',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerSubTitle: {
    color: '#FFE9E9',
    fontSize: 12,
  },
  bannerTag: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bannerTagText: {
    color: '#D91E18',
    fontWeight: '700',
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8C0E0E',
  },
  sectionAction: {
    fontSize: 12,
    color: '#D91E18',
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  categoryText: {
    fontSize: 12,
    color: '#9B0F0F',
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    shadowColor: '#B40000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardImageText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D91E18',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#8C8C8C',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPrice: {
    color: '#D91E18',
    fontWeight: '700',
    fontSize: 12,
  },
  cardStock: {
    color: '#6E6E6E',
    fontSize: 12,
  },
  cardAction: {
    marginLeft: 10,
    backgroundColor: '#D91E18',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
