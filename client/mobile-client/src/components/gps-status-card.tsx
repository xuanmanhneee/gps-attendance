import React from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import * as Location from 'expo-location';
import { Card } from './ui/card';
import { COLORS } from '../constants/theme';

interface GPSStatusCardProps {
  location: Location.LocationObject;
  distance?: number | null;
}

export const GPSStatusCard = ({ location, distance }: GPSStatusCardProps) => {
  const latitude = location.coords.latitude.toFixed(6);
  const longitude = location.coords.longitude.toFixed(6);
  const accuracy = location.coords.accuracy?.toFixed(2) || 'N/A';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Thông Tin GPS</Text>
        <Text style={styles.status}>🟢 Đang theo dõi</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Vĩ độ:</Text>
          <Text style={styles.value}>{latitude}°</Text>
        </View>

        <View style={styles.divider} />

        {distance !== undefined && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Khoảng cách tới lớp:</Text>
              <Text style={styles.value}>{distance ?? 'N/A'} m</Text>
            </View>
            <View style={styles.divider} />
          </>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Kinh độ:</Text>
          <Text style={styles.value}>{longitude}°</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Độ chính xác:</Text>
          <Text style={styles.value}>{accuracy} m</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Độ cao:</Text>
          <Text style={styles.value}>
            {location.coords.altitude?.toFixed(2) || 'N/A'} m
          </Text>
        </View>
      </View>

      <Text style={styles.timestamp}>
        Cập nhật: {new Date(location.timestamp).toLocaleTimeString('vi-VN')}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
