import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

type Props = {
  onCapture: (uri: string) => Promise<void>;
  label?: string;
};

export function CameraCapture({ onCapture, label = "Add Photo" }: Props) {
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  async function pickImage(useCamera: boolean) {
    setLoading(true);
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission needed", "Camera access is required to photograph clothes.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
            allowsMultipleSelection: false,
          });

      if (result.canceled || !result.assets[0]) return;

      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      await onCapture(manipulated.uri);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color={colors.tint} size="large" />
      ) : (
        <>
          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={() => pickImage(true)}
          >
            <Text style={styles.buttonText}>Take Photo</Text>
          </Pressable>
          <Pressable
            style={[styles.buttonOutline, { borderColor: colors.border }]}
            onPress={() => pickImage(false)}
          >
            <Text style={[styles.buttonOutlineText, { color: colors.text }]}>Choose from Library</Text>
          </Pressable>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{label}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
    alignItems: "center",
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonOutline: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  buttonOutlineText: {
    fontSize: 16,
    fontWeight: "500",
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
