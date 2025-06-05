import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [name, setName] = useState('');
  const [visits, setVisits] = useState<any[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [isSelf, setIsSelf] = useState(false);

  useEffect(() => {
    if (typeof userId === 'string') {
      fetchProfileAndVisits(userId);
    }
  }, [userId]);

  const fetchProfileAndVisits = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;
    setIsSelf(currentUser?.id === id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, photo_url')
      .eq('id', id)
      .single();

    setName(profile?.name ?? 'Usuario');
    setAvatar(profile?.photo_url ?? null);

    const { data: userVisits } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', id);

    setVisits(userVisits ?? []);

    if (currentUser) {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(requester_id.eq.${currentUser.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUser.id})`
        );

      const accepted = friendships?.find((f) => f.status === 'accepted');
      const pending = friendships?.find(
        (f) => f.status === 'pending' && f.requester_id === currentUser.id
      );

      setIsFriend(!!accepted);
      setHasPending(!!pending);
    }
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

  const visitsByMonth: Record<number, { day: number; photo_url: string | null }[]> = {};
  visitsThisYear.forEach((v) => {
    const date = new Date(v.created_at);
    const month = date.getMonth();
    const day = date.getDate();
    if (!visitsByMonth[month]) visitsByMonth[month] = [];
    if (!visitsByMonth[month].some((d) => d.day === day)) {
      visitsByMonth[month].push({ day, photo_url: v.photo_url });
    }
  });
  const morningVisits = visitsThisYear.filter((v) => {
    const hour = new Date(v.created_at).getHours();
    return hour >= 6 && hour < 12;
  }).length;
  const nightVisits = visitsThisYear.length - morningVisits;
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
  const favoriteCountry = (() => {
    const counts: Record<string, number> = {};
    visitsThisYear.forEach((v) => {
      if (v.country) {
        counts[v.country] = (counts[v.country] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  const handleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;
    if (!currentUser || typeof userId !== 'string') return;

    await supabase.from('friendships').insert({
      requester_id: currentUser.id,
      addressee_id: userId,
      status: 'pending',
    });
    setHasPending(true);
  };

  const countryCodeToEmoji = (cc: string) =>
    cc
      .toUpperCase()
      .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.tiktokHeader}>
          <Image
            source={require('@/assets/images/default-avatar.png')}
            style={styles.profileImage}
          />
          <Text style={styles.username}>{name}</Text>
          {!isSelf && !isFriend && !hasPending && (
            <Pressable style={styles.followBtn} onPress={handleFollow}>
              <Text style={styles.followText}>Seguir</Text>
            </Pressable>
          )}
          {hasPending && !isFriend && (
            <Text style={styles.pendingText}>Solicitud enviada</Text>
          )}

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
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>General</Text>
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
                  <Text style={styles.statNumber}>{morningVisits}</Text>
                  <Text style={styles.statLabel}>Mañanas</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{nightVisits}</Text>
                  <Text style={styles.statLabel}>Noches</Text>
                </View>
              </View>
            </View>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Países</Text>

              <Text style={styles.flagsRow}>
                {countriesThisYear.map((c) => countryCodeToEmoji(c)).join(' ')}
              </Text>
            </View>
          </View>
          <MapView
            style={styles.worldMap}
            initialRegion={{
              latitude: 0,
              longitude: 0,
              latitudeDelta: 120,
              longitudeDelta: 120,
            }}
          >
            {visits.map(
              (v, i) =>
                v.latitude &&
                v.longitude && (
                  <Marker
                    key={i}
                    coordinate={{ latitude: v.latitude, longitude: v.longitude }}
                    title={v.beach}
                  />
                )
            )}
          </MapView>
          <View style={styles.calendarSection}>
            {Object.keys(visitsByMonth)
              .sort((a, b) => Number(a) - Number(b))
              .map((monthKey) => {
                const month = Number(monthKey);
                const monthName = new Date(currentYear, month)
                  .toLocaleString('default', { month: 'long' });
                return (
                  <View key={month} style={styles.monthBlock}>
                    <Text style={styles.monthTitle}>{monthName}</Text>
                    <View style={styles.daysRow}>
                      {visitsByMonth[month]
                        .sort((a, b) => a.day - b.day)
                        .map(({ day, photo_url }) => (
                          <View key={day} style={styles.dayItem}>
                            {photo_url ? (
                              <Image
                                source={{ uri: photo_url }}
                                style={styles.dayBall}
                              />
                            ) : (
                              <View style={[styles.dayBall, { backgroundColor: '#ccc' }]} />
                            )}
                            <Text style={styles.dayLabel}>{day}</Text>
                          </View>
                        ))}
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>
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

  followBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  followText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pendingText: {
    marginBottom: 8,
    color: '#555',
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
    alignItems: 'stretch',
    gap: 8,
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },

  sectionBlock: {
    marginTop: 8,
  },

  sectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 16,
  },

  favoriteCountry: {
    alignSelf: 'center',
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '600',
  },

  yearTitle: {
    fontWeight: 'bold',
  },

  flagsRow: {
    marginTop: 4,
    fontSize: 24,
  },
  worldMap: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginTop: 20,
  },
  calendarSection: {
    width: '100%',
    marginTop: 20,
  },
  monthBlock: {
    marginBottom: 16,
  },
  monthTitle: {
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dayItem: {
    alignItems: 'center',
    width: 60,
  },
  dayBall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  dayLabel: {
    marginTop: 4,
    fontSize: 12,
  },
});
