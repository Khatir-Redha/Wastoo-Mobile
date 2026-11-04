import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Leaf,
  Recycle,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isAxiosError } from "axios";
import { useAuth } from "../../context/AuthProvider";

type PublicRole = "CITIZEN" | "COLLECTOR" | "RECYCLING_CENTER";
type FieldErrors = {
  name?: string;
  phone?: string;
  form?: string;
};

const roles: {
  value: PublicRole;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "CITIZEN",
    title: "Individual / Supplier",
    description: "Publish recyclable materials and connect with collectors.",
    icon: UserRound,
  },
  {
    value: "COLLECTOR",
    title: "Collector",
    description: "Discover nearby materials and manage pickups.",
    icon: Truck,
  },
  {
    value: "RECYCLING_CENTER",
    title: "Recycling Center",
    description: "Connect with suppliers and acquire recyclable materials.",
    icon: Recycle,
  },
];

const isValidPhone = (value: string) => {
  const compact = value.trim().replace(/[()\s.-]/g, "");
  if (compact.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(compact);
  }
  return /^(?:[2-7]\d{8}|0[2-7]\d{8})$/.test(compact);
};

const getApiError = (error: unknown): FieldErrors => {
  if (!isAxiosError(error)) {
    return { form: "Registration could not be completed. Please try again." };
  }

  const data = error.response?.data as
    | {
        message?: unknown;
        details?: Record<string, string[]>;
      }
    | undefined;
  const name = data?.details?.name?.[0];
  const phone = data?.details?.phone?.[0];
  const message = Array.isArray(data?.message)
    ? data.message.join(" ")
    : typeof data?.message === "string"
      ? data.message
      : undefined;

  if (name || message?.toLowerCase().includes("display name")) {
    return {
      name: name || message,
    };
  }
  if (phone || message?.toLowerCase().includes("phone")) {
    return {
      phone: phone || message,
    };
  }
  return {
    form: message || "Registration could not be completed. Please try again.",
  };
};

export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuth();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<PublicRole | null>(null);
  const [displayName, setDisplayName] = useState(() => user?.name ?? "");
  const displayNameTouched = useRef(false);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [roleError, setRoleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!displayNameTouched.current) {
      setDisplayName(user?.name ?? "");
    }
  }, [user?.name]);

  const submit = async () => {
    if (submitting.current) return;

    const nextErrors: FieldErrors = {};
    const name = displayName.trim();
    if (name.length > 100) {
      nextErrors.name = "Display name must be 100 characters or fewer.";
    }
    if (!isValidPhone(phone)) {
      nextErrors.phone =
        "Enter a valid phone number, such as 0550 12 34 56 or +33 6 12 34 56 78.";
    }
    setErrors(nextErrors);
    if (!role) {
      setRoleError("Please choose the account type that best describes you.");
    }
    if (!role || Object.keys(nextErrors).length > 0) return;

    submitting.current = true;
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        role,
        name: name || undefined,
        phone: phone.trim(),
      });
    } catch (error) {
      setErrors(getApiError(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandMark}>
            <Leaf size={23} color="#fff" />
          </View>
          <Text style={styles.heading}>Welcome to Wastoo</Text>
          <Text style={styles.subtitle}>
            Your account is almost ready. Tell us a little about yourself.
          </Text>

          <Text style={styles.sectionLabel}>I want to join as</Text>
          <View style={styles.roleList}>
            {roles.map((item) => {
              const selected = role === item.value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setRole(item.value);
                    setRoleError("");
                  }}
                  style={[styles.roleCard, selected && styles.roleCardSelected]}
                >
                  <View
                    style={[
                      styles.roleIcon,
                      selected && styles.roleIconSelected,
                    ]}
                  >
                    <item.icon
                      size={23}
                      color={selected ? "#087F5B" : "#60736d"}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.roleCopy}>
                    <Text style={styles.roleTitle}>{item.title}</Text>
                    <Text style={styles.roleDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {!!roleError && <Text style={styles.errorText}>{roleError}</Text>}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              value={displayName}
              onChangeText={(value) => {
                displayNameTouched.current = true;
                setDisplayName(value);
                setErrors((previous) => ({
                  ...previous,
                  name: undefined,
                  form: undefined,
                }));
              }}
              autoCapitalize="words"
              maxLength={100}
              placeholder="Your name"
              placeholderTextColor="#91a09a"
              style={[styles.input, !!errors.name && styles.inputError]}
              accessibilityLabel="Display name"
              returnKeyType="next"
            />
            <Text style={styles.helper}>
              Prefilled from your Google profile. You can edit how your name
              appears on Wastoo.
            </Text>
            {!!errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone number</Text>
            <View
              style={[
                styles.phoneInputWrap,
                !!errors.phone && styles.inputError,
              ]}
            >
              <View style={styles.countryCode}>
                <Text style={styles.countryFlag}>DZ</Text>
                <Text style={styles.countryCodeText}>+213</Text>
              </View>
              <View style={styles.phoneDivider} />
              <TextInput
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setErrors((previous) => ({
                    ...previous,
                    phone: undefined,
                    form: undefined,
                  }));
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                placeholder="0550 12 34 56"
                placeholderTextColor="#91a09a"
                style={styles.phoneInput}
                accessibilityLabel="Phone number"
                returnKeyType="done"
              />
            </View>
            <Text style={styles.helper}>
              Algeria is selected by default. For another country, enter the
              full number with its + dialing code.
            </Text>
            {!!errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>

          {!!errors.form && (
            <Text accessibilityRole="alert" style={styles.formError}>
              {errors.form}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={submit}
            disabled={isSubmitting}
            style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Complete registration</Text>
            )}
          </Pressable>
          <Text style={styles.privacyNote}>
            Your phone number is saved as unverified. Wastoo will never mark it
            verified without a real verification step.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  brandMark: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#087F5B",
    marginBottom: 18,
  },
  heading: {
    color: "#172B2A",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64746e",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 25,
    maxWidth: 340,
  },
  sectionLabel: {
    color: "#172B2A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 11,
  },
  roleList: {
    gap: 10,
  },
  roleCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: "#F5F8F6",
    borderWidth: 1,
    borderColor: "#E6ECE8",
    borderRadius: 16,
  },
  roleCardSelected: {
    backgroundColor: "#F0FAF6",
    borderColor: "#087F5B",
  },
  roleIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#E8EFEB",
  },
  roleIconSelected: {
    backgroundColor: "#DDF5EA",
  },
  roleCopy: {
    flex: 1,
    marginHorizontal: 11,
  },
  roleTitle: {
    color: "#172B2A",
    fontSize: 14,
    fontWeight: "700",
  },
  roleDescription: {
    color: "#66756f",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#AAB7B1",
    borderRadius: 10,
  },
  radioSelected: {
    borderColor: "#087F5B",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#087F5B",
  },
  fieldGroup: {
    marginTop: 20,
  },
  label: {
    color: "#172B2A",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    height: 52,
    paddingHorizontal: 15,
    color: "#172B2A",
    fontSize: 15,
    backgroundColor: "#F5F8F6",
    borderWidth: 1,
    borderColor: "#E0E8E3",
    borderRadius: 13,
  },
  inputError: {
    borderColor: "#D14343",
  },
  helper: {
    color: "#7A8983",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  phoneInputWrap: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#F5F8F6",
    borderWidth: 1,
    borderColor: "#E0E8E3",
    borderRadius: 13,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  countryFlag: {
    color: "#52655e",
    fontSize: 11,
    fontWeight: "800",
  },
  countryCodeText: {
    color: "#172B2A",
    fontSize: 14,
    fontWeight: "700",
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#D8E1DC",
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    minHeight: 48,
    padding: 0,
    color: "#172B2A",
    fontSize: 15,
  },
  errorText: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  formError: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
  submitButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
    borderRadius: 16,
    backgroundColor: "#087F5B",
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  privacyNote: {
    color: "#829089",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 12,
  },
});
