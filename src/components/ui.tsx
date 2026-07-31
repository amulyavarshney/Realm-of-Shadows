import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { CONTENT_MAX_WIDTH } from '../config';

export function ScreenBg({
  children,
  image,
  style,
}: {
  children: React.ReactNode;
  image?: any;
  style?: StyleProp<ViewStyle>;
}) {
  const gradient = (
    <LinearGradient
      colors={['rgba(13,13,17,0.55)', 'rgba(13,13,17,0.92)', '#0D0D11']}
      style={StyleSheet.absoluteFill}
    />
  );
  if (image) {
    return (
      <ImageBackground source={image} style={[{ flex: 1 }, style]} resizeMode="cover">
        {gradient}
        {children}
      </ImageBackground>
    );
  }
  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.surface }, style]}>
      <LinearGradient colors={['#1A1A22', '#0D0D11']} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

/** Centers content and caps width on tablets */
export function Content({
  children,
  style,
  pad = 20,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pad?: number;
}) {
  return (
    <View style={[{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: pad }, style]}>
      {children}
    </View>
  );
}

export function GoldButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  testID,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  icon?: string;
  testID?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';
  const bg = isPrimary
    ? (['#D4AF37', '#AA8C2C'] as const)
    : isDanger
      ? (['#8B0000', '#5A0000'] as const)
      : isSuccess
        ? (['#106A43', '#0A4C30'] as const)
        : (['transparent', 'transparent'] as const);
  const border = isPrimary ? '#D4AF37' : isDanger ? '#C42121' : isSuccess ? '#1DB271' : '#333340';
  const textColor = variant === 'ghost' ? theme.colors.parchment : isPrimary ? '#0D0D11' : '#F0EAD6';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btnWrap,
        {
          borderColor: border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <LinearGradient colors={[...bg]} style={styles.btnBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.btnRow}>
        {icon ? (
          <MaterialCommunityIcons name={icon as any} size={20} color={textColor} style={{ marginRight: 8 }} />
        ) : null}
        <Text style={[styles.btnText, { color: textColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export function OrnateTitle({
  children,
  size = 36,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: 'serif',
          fontSize: size,
          color: theme.colors.gold,
          textAlign: 'center',
          letterSpacing: 1.2,
          textShadowColor: '#D4AF3766',
          textShadowRadius: 12,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Divider({ text }: { text?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
      {text ? (
        <>
          <MaterialCommunityIcons
            name="star-four-points"
            size={12}
            color={theme.colors.gold}
            style={{ marginHorizontal: 8 }}
          />
          <Text
            style={{
              color: theme.colors.onSurface3,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {text}
          </Text>
          <MaterialCommunityIcons
            name="star-four-points"
            size={12}
            color={theme.colors.gold}
            style={{ marginHorizontal: 8 }}
          />
        </>
      ) : null}
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Full-screen privacy reminder for secret pass-and-play actions */
export function PrivacyOverlay({ message }: { message?: string }) {
  return (
    <View style={styles.privacyOverlay} pointerEvents="none">
      <MaterialCommunityIcons name="eye-off-outline" size={18} color={theme.colors.gold} />
      <Text style={styles.privacyText}>
        {message ?? 'Ensure no one else can see this screen'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btnWrap: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 52,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnBg: {
    ...StyleSheet.absoluteFill,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  btnText: {
    fontFamily: 'serif',
    fontSize: 17,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  privacyOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(13,13,17,0.92)',
    borderWidth: 1,
    borderColor: theme.colors.goldDark,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  privacyText: {
    color: theme.colors.onSurface2,
    fontSize: 12,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
});
