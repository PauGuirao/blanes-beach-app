import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

interface Request {
  id: string;
  requester_id: string;
  requester_name: string;
}

export default function SocialScreen() {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, profiles!requester_id(name)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    const reqs = (data ?? []).map((r: any) => ({
      id: r.id,
      requester_id: r.requester_id,
      requester_name: r.profiles?.name || 'Alguien',
    }));
    setRequests(reqs);
  };

  const acceptRequest = async (id: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', id);
    fetchRequests();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Solicitudes</Text>
      {requests.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={styles.name}>{r.requester_name}</Text>
          <Pressable
            style={styles.acceptBtn}
            onPress={() => acceptRequest(r.id)}
          >
            <Text style={styles.btnText}>Aceptar</Text>
          </Pressable>
        </View>
      ))}
      {requests.length === 0 && (
        <Text style={styles.empty}>No tienes solicitudes pendientes</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  name: { flex: 1, fontSize: 16 },
  acceptBtn: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  btnText: { color: '#fff', fontWeight: 'bold' },
  empty: { marginTop: 20, color: '#555' },
});
