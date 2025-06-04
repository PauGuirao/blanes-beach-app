// app/(modals)/comment/[visitDayId].tsx
import { supabase } from '@/lib/supabase';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CommentModal() {
  const { visitDayId } = useLocalSearchParams();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('visit_day_comments')
      .select('comment, created_at, user_id')
      .eq('visit_day_id', visitDayId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { error } = await supabase.from('visit_day_comments').insert({
      user_id: user.id,
      visit_day_id: visitDayId,
      comment: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      fetchComments();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Comentarios', presentation: 'modal' }} />

      <FlatList
        data={comments}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentText}>{item.comment}</Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          style={styles.input}
          placeholder="Escribe un comentario..."
        />
        <Button title="Enviar" onPress={handleSend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  comment: { marginBottom: 12, backgroundColor: '#f3f3f3', padding: 10, borderRadius: 8 },
  commentText: { fontSize: 14 },
  date: { fontSize: 10, color: '#555', marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
});
