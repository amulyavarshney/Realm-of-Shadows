import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';
import { OrnateTitle, Content } from '@/src/components/ui';
import { HERO_IMAGE_URI } from '@/src/config';
import { useResponsive } from '@/src/hooks/useResponsive';

export default function Splash() {
  const router = useRouter();
  const { titleScale } = useResponsive();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/menu'), 1100);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D11' }} testID="splash-screen">
      <Image
        source={{ uri: HERO_IMAGE_URI }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        priority="high"
      />
      <LinearGradient
        colors={['rgba(13,13,17,0.4)', 'rgba(13,13,17,0.85)', '#0D0D11']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Content>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.crest}>
              <MaterialCommunityIcons name="shield-crown" size={72} color={theme.colors.gold} />
            </View>
            <OrnateTitle size={40 * titleScale} style={{ marginTop: 20 }}>
              Realm of Shadows
            </OrnateTitle>
            <Text style={styles.tagline}>· A Game of Trust & Treachery ·</Text>
            <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 40 }} />
          </View>
        </Content>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  crest: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(13,13,17,0.7)',
    borderWidth: 2,
    borderColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.gold,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  tagline: {
    color: theme.colors.onSurface2,
    letterSpacing: 3,
    fontStyle: 'italic',
    marginTop: 6,
    fontSize: 12,
    textTransform: 'uppercase',
  },
});
