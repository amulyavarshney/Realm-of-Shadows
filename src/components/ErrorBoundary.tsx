import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/src/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors and offers a recoverable restart UI. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root} accessibilityRole="alert">
          <MaterialCommunityIcons name="alert-octagon-outline" size={56} color={theme.colors.errorGlow} />
          <Text style={styles.title} accessibilityRole="header">
            Something went wrong
          </Text>
          <Text style={styles.body}>
            The app hit an unexpected error. You can try again — your Pass & Play progress is saved on
            device when possible.
          </Text>
          {__DEV__ && this.state.error.message ? (
            <Text style={styles.detail} selectable>
              {this.state.error.message}
            </Text>
          ) : null}
          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    color: theme.colors.parchment,
    fontFamily: 'serif',
    fontSize: 22,
    marginTop: 16,
    textAlign: 'center',
  },
  body: {
    color: theme.colors.onSurface2,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  detail: {
    color: theme.colors.onSurface3,
    fontSize: 11,
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  btn: {
    marginTop: 28,
    backgroundColor: theme.colors.goldDark,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minHeight: 48,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: theme.colors.gold,
    fontFamily: 'serif',
    fontSize: 16,
    letterSpacing: 1,
  },
});
