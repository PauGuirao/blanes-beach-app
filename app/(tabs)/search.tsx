import SmallMarker from '@/components/SmallMarker';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView from 'react-native-maps';

export default function SearchTab() {
  const [visits, setVisits] = useState<any[]>([]);
  const [dayLikes, setDayLikes] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchRandomVisits();
    fetchDayLikes();
  }, []);

  const fetchRandomVisits = async () => {
    const { data } = await supabase
      .from('visits')
      .select(
        'id, photo_url, user_id, latitude, longitude, created_at, country, profiles(name)'
      )
      .limit(40);

    if (data) {
      const shuffled = data.sort(() => Math.random() - 0.5);
      setVisits(
        shuffled.map((v) => ({
          ...v,
          username: v.profiles?.name ?? 'Alguien',
          visitDayId: `${v.user_id}_${new Date(v.created_at).toISOString().slice(0, 10)}`,
        }))
      );
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

  // Buscar usuarios con un pequeño retardo (debounce)
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username')
        .ilike('username', `%${query.trim()}%`)
        .limit(10);

      if (!error) setUsers(data ?? []);
      console.log('query:', query); // eslint-disable-line no-cons
      console.log('users', data); // eslint-disable-line no-console
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const renderVisit = ({ item }: { item: any }) => (
    <Pressable style={styles.item} onPress={() => router.push(`/visit/${item.id}`)}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.photo_url }} style={styles.image} />
        <View style={styles.usernameOverlay}>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{item.username}</Text>
            {item.country && (
              <Text style={styles.flag}>{countryCodeToEmoji(item.country)}</Text>
            )}
          </View>
        </View>
        <View style={styles.likesOverlay}>
          <FontAwesome name="heart-o" size={12} color="#fff" />
          <Text style={styles.likesText}>{dayLikes[item.visitDayId] ?? 0}</Text>
        </View>
        {item.latitude && item.longitude && (
          <MapView
            style={styles.mapOverlay}
            initialRegion={{
              latitude: item.latitude,
              longitude: item.longitude,
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
            <SmallMarker
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            />
          </MapView>
        )}
      </View>
    </Pressable>
  );

  const renderUser = ({ item }: { item: any }) => (
    <Pressable
      style={styles.userRow}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <Image
        source={
          item.photo_url
            ? { uri: item.photo_url }
            : require('@/assets/images/default-avatar.png')
        }
        style={styles.userAvatar}
      />
      <Text style={styles.userName}>{item.username}</Text>
    </Pressable>
  );

  const countryCodeToEmoji = (cc: string) =>
    cc
      .toUpperCase()
      .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        placeholder="Buscar usuarios"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      {query ? (
        <FlatList
          key="users"
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key="visits"
          data={visits}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderVisit}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  search: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  item: {
    flex: 1,
    marginHorizontal: 4,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 8,
  },
  usernameOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    color: '#fff',
    fontSize: 12,
  },
  flag: {
    color: '#fff',
    fontSize: 12,
  },
  likesOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesText: {
    color: '#fff',
    fontSize: 12,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#ccc',
  },
  userName: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
});
