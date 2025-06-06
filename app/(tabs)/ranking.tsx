import SmallMarker from '@/components/SmallMarker';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView from 'react-native-maps';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.85;
const SPACING = 10;

export default function RankingTab() {
  const [visits, setVisits] = useState<any[]>([]);
  const [dayLikes, setDayLikes] = useState<Record<string, number>>({});
  const [dayCommentsCount, setDayCommentsCount] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchVisits();
    fetchDayLikes();
    fetchDayComments();
  }, []);

  const fetchVisits = async () => {
    const startOfWeek = getStartOfWeek();
    const { data, error } = await supabase
      .from('visits')
      .select('*, profiles(name)')
      .gte('created_at', startOfWeek.toISOString());

    if (!error && data) {
      const enriched = data.map((v) => ({
        ...v,
        username: v.profiles?.name ?? 'Alguien',
      }));
      setVisits(enriched);
    } else if (error) {
      console.error('Error fetching visits:', error);
    }
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

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((c) => {
        counts[c.visit_day_id] = (counts[c.visit_day_id] || 0) + 1;
      });
      setDayCommentsCount(counts);
    }
  };

  const likeVisitDay = async (visitDayId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
          user_id: v.user_id,
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

  const grouped = getGroupedVisits(visits)
    .map((g) => {
      const id = `${g.user_id}_${g.date.toISOString().slice(0, 10)}`;
      return { ...g, id, likes: dayLikes[id] ?? 0 };
    })
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);

  if (grouped.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No hay visitas esta semana.</Text>
      </SafeAreaView>
    );
  }

  const top = grouped[0];
  const second = grouped[1];
  const third = grouped[2];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRowTop}>
        <Text style={styles.feedTitle}>Ranking semanal</Text>
      </View>
      {renderGroup(top)}
      <View style={styles.bottomRow}>
        {second && <View style={styles.bottomItem}>{renderGroup(second)}</View>}
        {third && <View style={styles.bottomItem}>{renderGroup(third)}</View>}
      </View>
    </SafeAreaView>
  );

  function renderGroup(item: any) {
    if (!item) return null;
    const visitDayId = item.id;
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
              {formatDate(item.date)} — fue a {item.visits.length} playa
              {item.visits.length > 1 ? 's' : ''}
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

            return (
              <View
                style={[styles.visitPreview, { width: ITEM_WIDTH, marginRight: SPACING }]}
              >
                <Image source={{ uri: v.photo_url }} style={styles.visitImage} />
                <View style={styles.infoOverlay}>
                  <Text style={styles.visitBeach}>{v.beach}</Text>
                  {v.comment ? (
                    <Text style={styles.visitComment}>“{v.comment}”</Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        <View style={styles.actionsRow}>
          <View style={styles.actionButton}>
            <FontAwesome
              name="heart"
              size={24}
              color="red"
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
  }

  function getStartOfWeek() {
    const date = new Date();
    const day = date.getDay();
    const diff = (day + 6) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }
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
  container: { flex: 1, backgroundColor: 'rgba(235, 235, 235, 0.5).5)', padding: 20, marginBottom: 80 },
  headerRowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8, paddingHorizontal: 22 },
  feedTitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', flex: 1, marginBottom: 12, marginTop: 10 },
  card: { marginBottom: 12, padding: 12, borderRadius: 0, paddingRight: 0 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bottomItem: { flex: 1, marginHorizontal: 4 },
  visitPreview: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  visitImage: { width: '100%', height: 350, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: 'rgba(89, 89, 89, 0.1)' },
  infoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: 'rgba(89, 89, 89, 0.5)' },
  visitBeach: { marginTop: 0, fontWeight: '500', fontSize: 14, color: '#fff' },
  visitComment: { marginTop: 4, fontSize: 13, fontStyle: 'italic', color: '#fff' },
  mapMini: { width: '100%', height: 345, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingLeft: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc' },
  headerTextContainer: { flex: 1, justifyContent: 'center' },
  username: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#555', marginTop: 2 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12, paddingLeft: 10 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 15, color: '#333' },
});

