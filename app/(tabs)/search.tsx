import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function SearchTab() {
  const [visits, setVisits] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchRandomVisits();
  }, []);

  const fetchRandomVisits = async () => {
    const { data } = await supabase
      .from('visits')
      .select('id, photo_url, user_id, profiles(name)')
      .limit(40);

    if (data) {
      const shuffled = data.sort(() => Math.random() - 0.5);
      setVisits(
        shuffled.map((v) => ({
          ...v,
          username: v.profiles?.name ?? 'Alguien',
        }))
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.item}>
      <Image source={{ uri: item.photo_url }} style={styles.image} />
      <Text style={styles.name}>{item.username}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        placeholder="Buscar"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
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
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  name: {
    marginTop: 4,
    textAlign: 'center',
  },
});
