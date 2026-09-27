import React from 'react';
<<<<<<< HEAD
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
=======
import { View, StyleSheet, ViewStyle } from 'react-native';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
import { COLORS } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  shadow?: boolean;
  header?: React.ReactNode;
  body?: React.ReactNode;
}

export const Card = ({
  children,
  style,
  shadow = true,
  header,
  body,
}: CardProps) => {
  return (
    <View style={[styles.container, shadow && styles.shadow, style]}>
      {header && <View style={styles.header}>{header}</View>}
      {body ?? children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
<<<<<<< HEAD
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
=======

  shadow: {
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  header: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
});
