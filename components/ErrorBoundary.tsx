import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={s.container}>
        <Text style={s.emoji}>:-(</Text>
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.message} numberOfLines={3}>
          {this.state.error?.message ?? "Unknown error"}
        </Text>
        <Pressable
          style={s.button}
          onPress={() => this.setState({ hasError: false, error: null })}
        >
          <Text style={s.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0D12",
    padding: 24,
  },
  emoji: {
    color: "#FFFFFF",
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#14F195",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#0D0D12",
    fontWeight: "700",
  },
});
