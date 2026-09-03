import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/login" />;
}

// import * as Location from 'expo-location';
// import { useState } from 'react';
// import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';


// export default function Index() {
//   const [result, setResult] = useState('');

//   const handleGetLocation = async () => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();

//       if (status !== 'granted') {
//         setResult('Quyền vị trí bị từ chối.');
//         return;
//       }

//       const position = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.BestForNavigation,
//       });

//       setResult(JSON.stringify(position, null, 2));
//     } catch (error: any) {
//       setResult('Lỗi: ' + (error?.message ?? String(error)));
//     }
//   };

//   const handleCheckIn = async () => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();

//       if (status !== 'granted') {
//         setResult('Quyền vị trí bị từ chối.');
//         return;
//       }

//       const position = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.BestForNavigation,
//       });

//       const result = await api.attendance.checkIn({
//         sessionId: 1,

//         location: {
//           latitude: position.coords.latitude,
//           longitude: position.coords.longitude,
//           accuracy: position.coords.accuracy ?? 0,
//           timestamp: position.timestamp,
//           isMockLocation: position.mocked ?? false,
//         },

//         device: {
//           deviceId: 'test-device',
//           platform: 'android',
//           model: 'test-device',
//         },

//         integrity: {
//           integrityToken: null,
//         },
//       });

//       setResult(JSON.stringify(result, null, 2));
//     } catch (error: any) {
//       setResult('Điểm danh thất bại: ' + (error?.message ?? String(error)));
//     }
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <View>
//         <Button title="Lấy vị trí" onPress={handleGetLocation} />

//         <View style={styles.button}>
//           <Button title="Điểm danh" onPress={handleCheckIn} />
//         </View>

//         <View style={styles.resultBox}>
//           <Text style={styles.resultText}>{result}</Text>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flexGrow: 1,
//     padding: 24,
//     paddingTop: 80,
//   },

//   button: {
//     marginTop: 12,
//   },

//   resultBox: {
//     marginTop: 24,
//   },

//   resultText: {
//     fontFamily: 'monospace',
//     fontSize: 13,
//   },
// });
