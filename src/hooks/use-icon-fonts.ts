// Load only MaterialCommunityIcons in Expo Go (CDN). Native/web use autolinking.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts } from 'expo-font';

const ICON_VECTOR_VERSION = '15.0.2';

const MCI =
  `https://cdn.jsdelivr.net/npm/@expo/vector-icons@${ICON_VECTOR_VERSION}/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf`;

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? { 'material-community': MCI }
      : {},
  );
