import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { saveQuickCapture } from "../../../database/activity";

export default function QuickCaptureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [step, setStep] = useState<"capture" | "preview">("capture");
  const [extractedText, setExtractedText] = useState("");
  const [saving, setSaving] = useState(false);

  const mockScan = () => {
    setExtractedText(
      "Database normalization is the process of organizing data to reduce redundancy and improve data integrity."
    );

    setStep("preview");
  };

  const saveMaterial = async () => {
    if (!reviewerId || !extractedText.trim() || saving) return;
    setSaving(true);
    try {
      await saveQuickCapture(reviewerId, "Quick Capture", extractedText);
      router.back();
    } catch (error) {
      Alert.alert("Could not save capture", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "preview") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => setStep("capture")}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#292929"
            />
          </Pressable>

          <Text style={styles.headerTitle}>Review Scan</Text>

          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark"
              size={35}
              color="#58CC02"
            />
          </View>

          <Text style={styles.title}>Text extracted!</Text>

          <Text style={styles.subtitle}>
            Review and edit the text before saving it to
            your reviewer.
          </Text>

          <Text style={styles.sectionLabel}>
            EXTRACTED TEXT
          </Text>

          <TextInput
            style={styles.textArea}
            value={extractedText}
            onChangeText={setExtractedText}
            multiline
            textAlignVertical="top"
            placeholder="Extracted text will appear here..."
            placeholderTextColor="#AAAAAA"
          />

          <View style={styles.tipCard}>
            <Ionicons
              name="create-outline"
              size={21}
              color="#9069CD"
            />

            <Text style={styles.tipText}>
              You can correct OCR mistakes before saving
              this material.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          <Pressable
            style={[
              styles.saveButton,
              (!extractedText.trim() || saving) && styles.disabledButton,
            ]}
            disabled={!extractedText.trim() || saving}
            onPress={saveMaterial}
          >
            <Ionicons
              name="save-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.saveText}>
              SAVE TO REVIEWER
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#292929"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Quick Capture
        </Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cameraIcon}>
          <Ionicons
            name="scan-outline"
            size={38}
            color="#9069CD"
          />
        </View>

        <Text style={styles.title}>
          Scan your study notes
        </Text>

        <Text style={styles.subtitle}>
          Capture printed or handwritten notes and turn
          them into editable study material.
        </Text>

        <View style={styles.scanner}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          <Ionicons
            name="document-text-outline"
            size={62}
            color="#BBBBBB"
          />

          <Text style={styles.scannerTitle}>
            Position your notes here
          </Text>

          <Text style={styles.scannerSubtitle}>
            Make sure the text is clear and readable
          </Text>
        </View>

        <View style={styles.instructions}>
          <Instruction
            number="1"
            text="Place your notes on a clear surface."
          />

          <Instruction
            number="2"
            text="Make sure the page has enough light."
          />

          <Instruction
            number="3"
            text="Capture the page and review the detected text."
          />
        </View>

        <View style={styles.offlineCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#1CB0F6"
          />

          <Text style={styles.offlineText}>
            This is currently a frontend preview. Camera
            capture and OCR will be connected later.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
          style={styles.captureButton}
          onPress={mockScan}
        >
          <Ionicons
            name="camera"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.captureText}>
            CAPTURE NOTE
          </Text>
        </Pressable>

        <Pressable
          style={styles.galleryButton}
          onPress={mockScan}
        >
          <Ionicons
            name="images-outline"
            size={20}
            color="#58CC02"
          />

          <Text style={styles.galleryText}>
            Choose from Gallery
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Instruction({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <View style={styles.instruction}>
      <View style={styles.numberCircle}>
        <Text style={styles.numberText}>{number}</Text>
      </View>

      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9F7",
  },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "900",
    color: "#292929",
  },

  placeholder: {
    width: 42,
  },

  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 40,
  },

  cameraIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: "#F3EDFF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EAF9DF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  title: {
    textAlign: "center",
    fontSize: 23,
    fontWeight: "900",
    color: "#292929",
    marginTop: 14,
  },

  subtitle: {
    textAlign: "center",
    color: "#888888",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 28,
  },

  scanner: {
    height: 285,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D8D8D8",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 25,
  },

  scannerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#555555",
    marginTop: 15,
  },

  scannerSubtitle: {
    color: "#999999",
    fontSize: 11,
    marginTop: 5,
  },

  corner: {
    width: 32,
    height: 32,
    position: "absolute",
    borderColor: "#58CC02",
  },

  topLeft: {
    top: 18,
    left: 18,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },

  topRight: {
    top: 18,
    right: 18,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },

  bottomLeft: {
    bottom: 18,
    left: 18,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },

  bottomRight: {
    bottom: 18,
    right: 18,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },

  instructions: {
    gap: 12,
    marginBottom: 20,
  },

  instruction: {
    flexDirection: "row",
    alignItems: "center",
  },

  numberCircle: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#EAF9DF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  numberText: {
    color: "#58CC02",
    fontWeight: "900",
  },

  instructionText: {
    flex: 1,
    color: "#666666",
    fontSize: 12,
  },

  offlineCard: {
    flexDirection: "row",
    backgroundColor: "#EAF7FF",
    borderRadius: 17,
    padding: 15,
  },

  offlineText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 17,
    color: "#49758C",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#666666",
    marginBottom: 10,
  },

  textArea: {
    minHeight: 230,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 17,
    fontSize: 14,
    lineHeight: 22,
    color: "#333333",
  },

  tipCard: {
    flexDirection: "row",
    backgroundColor: "#F3EDFF",
    borderRadius: 17,
    padding: 15,
    marginTop: 15,
  },

  tipText: {
    flex: 1,
    marginLeft: 10,
    color: "#7864A3",
    fontSize: 11,
    lineHeight: 17,
  },

  bottom: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },

  captureButton: {
    width: "100%",
    maxWidth: 556,
    alignSelf: "center",
    height: 57,
    borderRadius: 17,
    backgroundColor: "#58CC02",
    borderBottomWidth: 4,
    borderBottomColor: "#46A302",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  captureText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  galleryButton: {
    width: "100%",
    maxWidth: 556,
    alignSelf: "center",
    height: 48,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  galleryText: {
    color: "#58CC02",
    fontWeight: "900",
    fontSize: 13,
  },

  saveButton: {
    width: "100%",
    maxWidth: 556,
    alignSelf: "center",
    height: 57,
    borderRadius: 17,
    backgroundColor: "#58CC02",
    borderBottomWidth: 4,
    borderBottomColor: "#46A302",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.45,
  },

  saveText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
});
