// app/tabs/index.tsx
import SmallMarker from '@/components/SmallMarker';
import { supabase } from '@/lib/supabase';
import { getClosestPointInfo } from '@/utils/testCoastDistance';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView from 'react-native-maps';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.85;
const SPACING = 10;

export default function HomeTab() {
  const [visits, setVisits] = useState<any[]>([]);
  const [dayLikes, setDayLikes] = useState<Record<string, number>>({});
  const [dayCommentsCount, setDayCommentsCount] = useState<Record<string, number>>({});
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

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

  const openReportModal = (postId: string) => {
    setSelectedPostId(postId);
    setReportReason('');
    setReportVisible(true);
  };

  const closeReportModal = () => setReportVisible(false);

  const submitReport = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !selectedPostId) return;

    console.log('Reporting post:', selectedPostId);
    const { data, error } =  await supabase.from('reports').insert({
      reported_by: user.id,
      post_day_id: selectedPostId,
      reason: reportReason,
    });
    if (error) {
      console.error('Supabase Insert Error:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      // You might want to update your UI to show this error to the user
    } else {
        console.log('Report successfully inserted:', data);
    }
    closeReportModal();
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
              <View>
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
                <Pressable
                  style={styles.moreButton}
                  onPress={() => openReportModal(visitDayId)}
                >
                  <FontAwesome name="ellipsis-v" size={20} color="black" />
                </Pressable>
              </View>
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
                        <Text style={styles.visitBeach}>
                          {v.city && v.countryLarge
                            ? `${v.city}, ${v.countryLarge}`
                            : v.beach}
                        </Text>
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
                    name={'heart-o'}
                    size={25}
                    color={'black'}
                    onPress={() => likeVisitDay(visitDayId)}
                  />
                  <Text style={styles.actionCount}>{dayLikes[visitDayId] ?? 0}</Text>
                </View>

                <View style={styles.actionButton}>
                  <FontAwesome
                    name="comment-o"
                    size={25}
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
      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={closeReportModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeReportModal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Denunciar publicación</Text>
            <TextInput
              style={styles.modalInput}
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Motivo"
            />
            <Pressable style={styles.modalButton} onPress={submitReport}>
              <Text style={styles.modalButtonText}>Enviar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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

  const uniqueVisits = useMemo(() => mergeCloseVisits(visits), [visits]);

  useEffect(() => {
    if (mapRef.current && uniqueVisits.length > 0) {
      const coords = uniqueVisits.map((v) => ({
        latitude: v.latitude,
        longitude: v.longitude,
      }));

      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  }, [uniqueVisits]);

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
        {uniqueVisits.map((v, i) => (
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

function mergeCloseVisits(visits: any[], maxDistance = 50) {
  const result: any[] = [];

  for (const v of visits) {
    const found = result.find((u) =>
      distanceMeters(u.latitude, u.longitude, v.latitude, v.longitude) < maxDistance
    );

    if (!found) {
      result.push(v);
    }
  }

  return result;
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  card: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 0,
    paddingRight: 0,
    position: 'relative',
  },
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
  moreButton: {
    position: 'absolute',
    right: 40,
    top: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    width: '80%',
    borderRadius: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  modalButton: { backgroundColor: '#007bff', padding: 10, borderRadius: 8 },
  modalButtonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
