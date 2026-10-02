import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { Body, Button, space, useTheme } from "@/components/ui";

type Props = {
  onCapture: (uri: string) => Promise<void>;
  label?: string;
};

export function CameraCapture({ onCapture, label }: Props) {
  const [loading, setLoading] = useState(false);
  const colors = useTheme();

  async function pickImage(useCamera: boolean) {
    setLoading(true);
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          useCamera ? "Camera access is required to photograph clothes." : "Photo library access is required.",
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [3, 4], quality: 0.8 };
      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: false });

      if (result.canceled || !result.assets[0]) return;

      // 1200px JPEG keeps uploads small and is plenty for garment recognition.
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
        <ActivityIndicator color={colors.tint} size="large" accessibilityLabel="Preparing photo" />
      ) : (
        <>
          <Button label="Take photo" onPress={() => pickImage(true)} />
          <Button label="Choose from library" variant="outline" onPress={() => pickImage(false)} />
          {label ? <Body tone="muted" style={styles.hint}>{label}</Body> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.md, paddingVertical: space.md },
  hint: { textAlign: "center", marginTop: space.xs },
});
