import React from 'react';
import { View } from 'react-native';
import { Marker, MarkerProps } from 'react-native-maps';

/**
 * Small round marker used across the app. The `Marker` component renders a
 * small circle instead of the default pin.
 */
export default function SmallMarker(props: MarkerProps) {
  return (
    <Marker {...props} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#0a7ea4',
          borderWidth: 1,
          borderColor: '#fff',
        }}
      />
    </Marker>
  );
}
