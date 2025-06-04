import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [visits, setVisits] = useState<any[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileAndVisits();
  }, []);

  const fetchProfileAndVisits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, photo_url')
      .eq('id', user.id)
      .single();

    setName(profile?.name ?? 'Usuario');

    const { data: userVisits } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', user.id);

    setName(profile?.name ?? 'Usuario');
    setAvatar(profile?.photo_url ?? null);
    setVisits(userVisits ?? []);
  };

  const totalVisits = visits.length;
  const distinctBeaches = Array.from(new Set(visits.map((v) => v.beach)));
  const visitsByBeach = distinctBeaches.map((beach) => ({
    beach,
    count: visits.filter((v) => v.beach === beach).length,
  }));

  const currentYear = new Date().getFullYear();
  const visitsThisYear = visits.filter(
    (v) => new Date(v.created_at).getFullYear() === currentYear
  );
  const daysThisYear = Array.from(
    new Set(visitsThisYear.map((v) => new Date(v.created_at).toDateString()))
  );
  const beachesThisYear = Array.from(
    new Set(visitsThisYear.map((v) => v.beach))
  );
  const countriesThisYear = Array.from(
    new Set(
      visitsThisYear
        .map((v) => v.country)
        .filter(Boolean)
    )
  );
  console.log('Visitas por playa:', countriesThisYear);

  const countryCodeToEmoji = (cc: string) =>
    cc
      .toUpperCase()
      .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tiktokHeader}>
        <Image
          source={require('@/assets/images/default-avatar.png')}
          style={styles.profileImage}
        />
        <Text style={styles.username}>{name}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{distinctBeaches.length}</Text>
            <Text style={styles.statLabel}>Playas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalVisits}</Text>
            <Text style={styles.statLabel}>Visitas</Text>
          </View>
        </View>

        <View style={styles.yearSummary}>
          <Text style={styles.yearTitle}>Resumen {currentYear}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{daysThisYear.length}</Text>
              <Text style={styles.statLabel}>Días</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{beachesThisYear.length}</Text>
              <Text style={styles.statLabel}>Playas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{countriesThisYear.length}</Text>
              <Text style={styles.statLabel}>Países</Text>
            </View>
          </View>
          <Text style={styles.flagsRow}>
            {countriesThisYear.map((c) => countryCodeToEmoji(c)).join(' ')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  stat: { fontSize: 16, marginBottom: 6 },
  section: { marginTop: 20, fontWeight: 'bold', fontSize: 18 },
  item: { paddingVertical: 4, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ccc',
  },
  
  centerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  statsBox: {
    alignItems: 'flex-end',
  },
  tiktokHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ccc',
    marginBottom: 12,
  },
  
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  statLabel: {
    fontSize: 14,
    color: '#666',
  },

  yearSummary: {
    marginTop: 12,
    alignItems: 'center',
    gap: 4,
  },

  yearTitle: {
    fontWeight: 'bold',
  },

  flagsRow: {
    marginTop: 4,
    fontSize: 24,
  },
});
