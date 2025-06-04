import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';


const BEACH_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Platja de Blanes': { latitude: 41.6744, longitude: 2.7906 },
  'Cala Sant Francesc': { latitude: 41.678825, longitude: 2.807331 },
  'Cala Treumal': { latitude: 41.6920, longitude: 2.7988 },
  'S’Abanell': { latitude: 41.6631, longitude: 2.7868 },
  'Platja dels Capellans': { latitude: 41.6752, longitude: 2.7883 },
};

export default function MapScreen() {
  const [visits, setVisits] = useState<any[]>([]);

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data, error } = await supabase
    .from('visits')
    .select(`
        id,
        beach,
        comment,
        created_at,
        user:profiles(name)
    `);

    console.log('VISITAS:', data);
    if (!error && data) setVisits(data);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text>🧭 El mapa no se muestra en modo web.</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      
        <MapView
          key={visits.length}
          style={styles.map}
          initialRegion={{
            latitude: 41.675,
            longitude: 2.790,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {visits.map((visit) => {
            const coords = BEACH_COORDINATES[visit.beach];
            console.log('COORDS:', coords);
            if (!coords){
              console.log('COORDS NO ENCONTRADAS');
              return null;
            }

            return (
              <Marker
                key={visit.id}
                coordinate={coords}
                title={`${visit.user.name} - ${visit.beach}`}
                description="Esto debería verse"
              />
            );
          })}
        </MapView>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
});
