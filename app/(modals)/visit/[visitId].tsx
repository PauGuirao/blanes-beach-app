import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';
import MapView from 'react-native-maps';
import SmallMarker from '@/components/SmallMarker';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export default function VisitModal() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<any | null>(null);
  const [likes, setLikes] = useState(0);

  const doubleTap = Gesture.Tap()
  .numberOfTaps(2)
  .onEnd(() => {
    likeVisitDay();
  });


  useEffect(() => {
    fetchVisit();
  }, [visitId]);

  const fetchVisit = async () => {
    if (!visitId) return;
    const { data, error } = await supabase
      .from('visits')
      .select('*, profiles(name)')
      .eq('id', visitId)
      .single();

    if (!error && data) {
      const enriched = { ...data, username: data.profiles?.name ?? 'Alguien' };
      setVisit(enriched);
      const dayId = `${enriched.user_id}_${new Date(enriched.created_at)
        .toISOString()
        .slice(0, 10)}`;
      const { count } = await supabase
        .from('visit_day_likes')
        .select('*', { count: 'exact', head: true })
        .eq('visit_day_id', dayId);
      setLikes(count ?? 0);
    }
  };

  const likeVisitDay = async () => {
    if (!visit) return;
    const visitDayId = `${visit.user_id}_${new Date(visit.created_at)
      .toISOString()
      .slice(0, 10)}`;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    await supabase
      .from('visit_day_likes')
      .insert({ user_id: user.id, visit_day_id: visitDayId });

    fetchVisit();
  };

  if (!visit) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Visita', presentation: 'fullScreenModal' }} />
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
        }}
      />
      <GestureDetector gesture={doubleTap}>
        <Image source={{ uri: visit.photo_url }} style={styles.image} />
      </GestureDetector>

      {visit.latitude && visit.longitude && (
        <MapView
          style={styles.mapOverlay}
          initialRegion={{
            latitude: visit.latitude,
            longitude: visit.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          pointerEvents="none"
          liteMode={true}
        >
          <SmallMarker coordinate={{ latitude: visit.latitude, longitude: visit.longitude }} />
        </MapView>
      )}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <FontAwesome name="chevron-left" size={24} color="white" />
      </Pressable>

      <View style={styles.userCommentContainer}>
        <Text style={styles.usernameText}>{visit.username}</Text>
        {visit.comment ? (
          <Text style={styles.commentText}>“{visit.comment}”</Text>
        ) : null}
      </View>

      <View style={styles.likesOverlay}>
        <FontAwesome name="heart" size={24} color="white" />
        <Text style={styles.likesText}>{likes}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { flex: 1, resizeMode: 'cover' },
  likesOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likesText: { color: '#fff', fontSize: 16 },
  mapOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  usernameText: { color: '#fff', fontSize: 16 },
  commentText: { color: '#fff', fontStyle: 'italic', fontSize: 16 },
  userCommentContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '70%',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },
});
