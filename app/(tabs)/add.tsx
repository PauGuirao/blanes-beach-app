import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { router, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Button,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';


export default function AddVisitScreen() {
  const [comment, setComment] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const navigation = useNavigation();
  const [photoTaken, setPhotoTaken] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: 'none' } });
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const country = await getCountryFromCoords(latitude, longitude);
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMarker({ latitude, longitude });
      setCountry(country);
    })();
  }, []);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }
  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const getCountryFromCoords = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      return result[0]?.country ?? null;
    } catch (error) {
      console.error('Error al obtener el país:', error);
      return null;
    }
  };

  const generateId = async () => {
    const bytes = await Crypto.getRandomBytesAsync(16);
    return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        const compressed = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            { resize: { width: 800 } },
            ...(facing === 'front' ? [{ flip: ImageManipulator.FlipType.Horizontal }] : []),
          ],
          { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImage(compressed.uri);
        setPhotoTaken(true);
      } catch (err) {
        console.error('Error al tomar la foto:', err);
      }
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const id = await generateId();
      const path = `visits/${id}.jpg`;

      const { error } = await supabase
        .storage
        .from('images')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error.message);
        return null;
      }

      const { data } = supabase.storage.from('images').getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const handleAddVisit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !marker) {
      Alert.alert('Error', 'Faltan datos para guardar la visita');
      return;
    }

    const photoUrl = image ? await uploadImage(image) : null;

    const { error } = await supabase.from('visits').insert([
      {
        user_id: user.id,
        comment,
        beach: 'Platja de Blanes',
        photo_url: photoUrl,
        latitude: marker.latitude,
        longitude: marker.longitude,
        country: country,
      },
    ]);

    if (error) {
      Alert.alert('Error al guardar visita', error.message);
    } else {
      Alert.alert('✅ Visita añadida con éxito');
      router.replace('/');
    }
  };

  return (
    <View style={styles.fullScreen}>
      {!photoTaken ? (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      ) : (
        <>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                {/* Imagen de fondo */}
                {image && (
                  <Image source={{ uri: image }} style={styles.fullScreenImage} />
                )}

                {/* Input como en WhatsApp */}
                <View style={styles.inputBar}>
                  <TextInput
                    placeholder="Añade un comentario..."
                    style={styles.textInput}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                  />
                  <TouchableOpacity style={styles.sendButton} onPress={handleAddVisit}>
                    <Ionicons name="arrow-up" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </>
      )}

      {/* Mapa flotante abajo izquierda */}
      {region && marker && (
        <MapView
          style={styles.miniMap}
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          toolbarEnabled={false}
        >
          <Marker coordinate={marker} />
        </MapView>
      )}

      {!photoTaken && (
        <>
          {/* Botón flip cámara */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.text}>↺</Text>
            </TouchableOpacity>
          </View>

          {/* Botón capturar */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePhoto}
          >
            <View style={styles.innerCircle} />
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity
        onPress={() => {
          if (photoTaken) {
            setImage(null);
            setPhotoTaken(false);
          } else {
            router.replace('/');
          }
        }}
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          zIndex: 50,
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 20,
          padding: 6,
        }}
      >
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1, // detrás de todo
  },
  miniMap: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 150,
    height: 150,
    borderRadius: 12,
    zIndex: 10,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    right: 60,
    zIndex: 20,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#fff',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  innerCircle: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
  },
  capturedImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  
  commentInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  commentForm: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
  },
  fullScreenImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  
  inputBar: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
  },
  
  textInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 15,
    color: 'white',
    maxHeight: 150,
  },
  
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#0084FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
