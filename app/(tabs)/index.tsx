// app/tabs/index.tsx
import SmallMarker from '@/components/SmallMarker';
import { supabase } from '@/lib/supabase';
import { getClosestPointInfo } from '@/utils/testCoastDistance';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.85;
const SPACING = 10;

export default function HomeTab() {
  const [visits, setVisits] = useState<any[]>([]);
  const [dayLikes, setDayLikes] = useState<Record<string, number>>({});
  const [dayCommentsCount, setDayCommentsCount] = useState<Record<string, number>>({});

  useEffect(() => {
    const lat = 41.7253;
    const lon = 2.9411; // Platja de Blanes
    const result = getClosestPointInfo(lat, lon);
    if (result) {
      console.log(result.isNear ? '✅ Cerca del mar' : '❌ Lejos del mar');
    }
    fetchVisits();
    fetchDayLikes();
    fetchDayComments();
  
    // 🟢 Suscribirse a eventos en 'visits'
    const channel = supabase
      .channel('realtime:visits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => {
          console.log('🆕 Cambio detectado en visits');
          fetchVisits(); // recargar visitas automáticamente
        }
      )
      .subscribe();
  
    // 🔴 Limpiar al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVisits = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const friendIds = (friendships ?? []).map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const userAndFriends = [user.id, ...friendIds];

    const { data, error } = await supabase
      .from('visits')
      .select('*, profiles(name)')
      .in('user_id', userAndFriends)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching visits:', error);
      return;
    }

    const enrichedVisits = data.map((v) => ({
      ...v,
      username: v.profiles?.name || 'Alguien',
    }));
    setVisits(enrichedVisits);
  };

  const fetchDayLikes = async () => {
    const { data, error } = await supabase
      .from('visit_day_likes')
      .select('visit_day_id');
  
    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((like) => {
        counts[like.visit_day_id] = (counts[like.visit_day_id] || 0) + 1;
      });
      setDayLikes(counts);
    }
  };
  const fetchDayComments = async () => {
    const { data, error } = await supabase
      .from('visit_day_comments')
      .select('visit_day_id');
  
    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }
  
    const counts: Record<string, number> = {};
    data.forEach((comment) => {
      counts[comment.visit_day_id] = (counts[comment.visit_day_id] || 0) + 1;
    });
  
    setDayCommentsCount(counts);
  };

  const likeVisitDay = async (visitDayId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
  
    await supabase
      .from('visit_day_likes')
      .insert({ user_id: user.id, visit_day_id: visitDayId });
  
    fetchDayLikes();
  };

  function getGroupedVisits(visits: any[]) {
    const groups: Record<string, {
      user_id: string;
      date: Date;
      username: string;
      visits: any[];
      key: string;
    }> = {};
    
  
    for (const v of visits) {
      const date = new Date(v.created_at);
      const dayKey = `${v.user_id}_${date.toDateString()}`;
  
      if (!groups[dayKey]) {
        groups[dayKey] = {
          user_id: v.user_id,            // ← añadimos esto
          date,
          username: v.username || 'Alguien',
          visits: [],
          key: dayKey,
        };
      }
  
      groups[dayKey].visits.push(v);
    }
  
    return Object.values(groups);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRowTop}>
        <Pressable onPress={() => router.push('/social')}>
          <FontAwesome name="heart-o" size={24} color="black" />
        </Pressable>
        <Text style={styles.feedTitle}>Tu feed</Text>
      </View>
      <FlatList
        data={getGroupedVisits(visits)}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const visitDayId = `${item.user_id}_${item.date.toISOString().slice(0, 10)}`;
          const visitsWithMap = [...item.visits, { type: 'map' }];
          return (
            <View style={styles.card}>
              <Pressable
                onPress={() => router.push(`/user/${item.user_id}`)}
                style={styles.headerRow}
              >
                <Image
                  source={require('@/assets/images/default-avatar.png')}
                  style={styles.avatar}
                />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.username}>{item.username}</Text>
                  <Text style={styles.subtitle}>
                    {formatDate(item.date)} — fue a {item.visits.length} playa{item.visits.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </Pressable>
              
              <FlatList
                data={visitsWithMap}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH + SPACING}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={{ paddingLeft: SPACING }}
                keyExtractor={(v, i) => v.id ?? `map-${i}`}
                renderItem={({ item: v }) => {
                  if (v.type === 'map') {
                    return <VisitMap visits={item.visits} />;
                  }

                  // visita normal
                  return (
                    <View style={[styles.visitPreview, { width: ITEM_WIDTH, marginRight: SPACING }]}>
                      <Image source={{ uri: v.photo_url }} style={styles.visitImage} />
                      <View style={styles.infoOverlay}>
                        <Text style={styles.visitBeach}>{v.beach}</Text>
                        {v.comment ? <Text style={styles.visitComment}>“{v.comment}”</Text> : null}
                      </View>
                    </View>
                  );
                }}
              />
  
              {/* 👍 Likes al día */}
              <View style={styles.actionsRow}>
                <View style={styles.actionButton}>
                  <FontAwesome
                    name={'heart'}
                    size={24}
                    color={'red'}
                    onPress={() => likeVisitDay(visitDayId)}
                  />
                  <Text style={styles.actionCount}>{dayLikes[visitDayId] ?? 0}</Text>
                </View>

                <View style={styles.actionButton}>
                  <FontAwesome
                    name="comment-o"
                    size={24}
                    color="black"
                    onPress={() => router.push(`/comment/${visitDayId}`)}
                  />
                  <Text style={styles.actionCount}>{dayCommentsCount[visitDayId] ?? 0}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const d = date.toDateString();
  if (d === today.toDateString()) return 'Hoy';
  if (d === yesterday.toDateString()) return 'Ayer';

  return date.toLocaleDateString();
}

function VisitMap({ visits }: { visits: any[] }) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && visits.length > 0) {
      const coords = visits.map((v) => ({
        latitude: v.latitude,
        longitude: v.longitude,
      }));

      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  }, [visits]);

  return (
    <View style={{ width: ITEM_WIDTH, marginRight: SPACING, borderRadius: 12, overflow: 'hidden' }}>
      <MapView
        ref={mapRef}
        style={styles.mapMini}
        scrollEnabled={true}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        liteMode={true}
      >
        {visits.map((v, i) => (
          <SmallMarker
            key={i}
            coordinate={{ latitude: v.latitude, longitude: v.longitude }}
            title={v.beach}
          />
        ))}
      </MapView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(235, 235, 235, 0.5).5)', padding: 20, marginBottom:80 },
  headerRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 12,
    paddingVertical:8,
    paddingHorizontal:22
  },
  card: { marginBottom: 12, padding: 12, borderRadius: 0, paddingRight:0 },
  beach: { fontWeight: 'bold', fontSize: 16 },
  date: { fontSize: 12, color: '#555' },
  feedTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    marginBottom: 12,
    marginTop: 10,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  visitPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  visitImage: {
    width: '100%',
    height: 350,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
  borderColor: 'rgba(89, 89, 89, 0.1)', // or any color you prefer
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(89, 89, 89, 0.5)',
  },
  visitBeach: {
    marginTop: 0,
    fontWeight: '500',
    fontSize: 14,
    color: '#fff',
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  visitComment: {
    marginTop: 4,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#fff',
  },
  mapMini: {
    width: '100%',
    height: 345,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingLeft: 10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  }, 
  iconRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  icon: {
    padding: 4,
  }, 

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 12,
    paddingLeft: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 15,
    color: '#333',
  },
});
