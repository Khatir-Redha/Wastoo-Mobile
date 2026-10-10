import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthProvider";
import { Button, Input } from "../../components/ui";
import { theme } from "../../theme/tokens";
import api from "../../../lib/api";

const { width } = Dimensions.get("window");

// ==========================================
// BACKGROUND LEAF ANIMATION (kept as-is for visual flair)
// ==========================================
const AnimatedLeaf = ({ config }: { config: any }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const movementAnimation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: config.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const timeoutId = setTimeout(() => {
      movementAnimation.start();
    }, config.delay);

    return () => {
      clearTimeout(timeoutId);
      movementAnimation.stop();
    };
  }, []);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, config.tx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, config.ty] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${config.rot}deg`] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, config.maxOpacity, config.maxOpacity, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: `${config.top}%`,
        left: `${config.left}%`,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale: config.scale }],
      }}
    >
      <Svg viewBox="0 0 24 24" width={20} height={20}>
        <Path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22l1-2.3A4.49,4.49 0 0,0 8,20C19,20 22,3 22,3c0,0-2.07,0-5,5Z" fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
};

// ==========================================
// SIGN IN FORM COMPONENT
// ==========================================
const LoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "Invalid credentials. Please try again.";
      Alert.alert("Login Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <Input
        label="Email"
        icon="mail"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Password"
        icon="lock"
        placeholder="Enter your password"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        rightIcon={showPassword ? "eye" : "eye-off"}
        onRightIconPress={() => setShowPassword(!showPassword)}
        containerStyle={styles.inputContainer}
      />

      <View style={styles.optionsRow}>
        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.checkbox,
            rememberMe && styles.checkboxActive,
          ]}>
            {rememberMe && <MaterialIcons name="check" size={14} color={theme.colors.canvas.primary} />}
          </View>
          <Text style={styles.rememberMeText}>Remember me</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <Button
        title="Sign In"
        variant="primary"
        size="lg"
        onPress={handleLogin}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.submitButton}
      />
    </View>
  );
};

// ==========================================
// REGISTRATION FORM COMPONENT
// ==========================================
const RegisterForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("CITIZEN");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      Alert.alert("Terms Required", "Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role: selectedRole
      });

      Alert.alert("Success!", "Your account has been created. Please sign in.");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "An error occurred during registration.";
      Alert.alert("Registration Error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordMismatch = password && confirmPassword && password !== confirmPassword;

  return (
    <View style={styles.formContainer}>
      <Input
        label="Full Name"
        icon="user"
        placeholder="Karim Benali"
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Email"
        icon="mail"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Password"
        icon="lock"
        placeholder="Min. 8 characters"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        rightIcon={showPassword ? "eye" : "eye-off"}
        onRightIconPress={() => setShowPassword(!showPassword)}
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Confirm Password"
        icon="lock"
        placeholder="••••••••"
        secureTextEntry={!showConfirmPassword}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        rightIcon={showConfirmPassword ? "eye" : "eye-off"}
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
        error={passwordMismatch ? "Passwords do not match" : undefined}
        containerStyle={styles.inputContainer}
      />

      {/* Role Selection */}
      <View style={styles.roleSection}>
        <Text style={styles.roleLabel}>I am a...</Text>
        <View style={styles.roleGrid}>
          <TouchableOpacity
            onPress={() => setSelectedRole("CITIZEN")}
            style={[
              styles.roleButton,
              selectedRole === "CITIZEN" && styles.roleButtonActive,
            ]}
          >
            <FontAwesome5
              name="leaf"
              size={15}
              color={selectedRole === "CITIZEN" ? theme.colors.green[600] : theme.colors.text.tertiary}
            />
            <Text style={[
              styles.roleButtonText,
              selectedRole === "CITIZEN" && styles.roleButtonTextActive,
            ]}>
              Citizen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedRole("COLLECTOR")}
            style={[
              styles.roleButton,
              selectedRole === "COLLECTOR" && styles.roleButtonActive,
            ]}
          >
            <FontAwesome5
              name="truck"
              size={14}
              color={selectedRole === "COLLECTOR" ? theme.colors.green[600] : theme.colors.text.tertiary}
            />
            <Text style={[
              styles.roleButtonText,
              selectedRole === "COLLECTOR" && styles.roleButtonTextActive,
            ]}>
              Collector
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedRole("RECYCLING_CENTER")}
            style={[
              styles.roleButtonFull,
              selectedRole === "RECYCLING_CENTER" && styles.roleButtonActive,
            ]}
          >
            <FontAwesome5
              name="industry"
              size={15}
              color={selectedRole === "RECYCLING_CENTER" ? theme.colors.green[600] : theme.colors.text.tertiary}
            />
            <Text style={[
              styles.roleButtonText,
              selectedRole === "RECYCLING_CENTER" && styles.roleButtonTextActive,
            ]}>
              Recycling Centre
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Terms Checkbox */}
      <TouchableOpacity
        style={styles.termsContainer}
        onPress={() => setAgreeTerms(!agreeTerms)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkbox,
          agreeTerms && styles.checkboxActive,
        ]}>
          {agreeTerms && <MaterialIcons name="check" size={14} color={theme.colors.canvas.primary} />}
        </View>
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      <Button
        title="Create Account"
        variant="primary"
        size="lg"
        onPress={handleRegister}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.submitButton}
      />
    </View>
  );
};

// ==========================================
// MAIN SCREEN EXPORT
// ==========================================
export default function AuthScreen() {
  const { googleLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await googleLogin();
    } catch (error: any) {
      const message = error?.message || "Google sign-in failed. Please try again.";
      if (!message.toLowerCase().includes("cancel")) {
        Alert.alert("Google Sign-In Failed", message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const leaves = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: -10 + Math.random() * 100,
      duration: (12 + Math.random() * 15) * 1000,
      delay: Math.random() * 10000,
      tx: 60 + Math.random() * 150,
      ty: -20 + Math.random() * 60,
      rot: 90 + Math.random() * 270,
      maxOpacity: 0.15 + Math.random() * 0.25,
      scale: 0.5 + Math.random() * 0.7,
    }));
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.green[500]} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* Header with Gradient & Leaf Animation */}
        <LinearGradient
          colors={[theme.colors.green[500], theme.colors.green[600]]}
          style={styles.header}
        >
          <View style={styles.leafContainer}>
            {leaves.map((config) => (
              <AnimatedLeaf key={config.id} config={config} />
            ))}
          </View>

          <View style={styles.headerContent}>
            <MaterialIcons name="recycling" size={64} color={theme.colors.canvas.primary} />
            <Text style={styles.headerTitle}>
              {isLogin ? "Welcome back" : "Join Wasto"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isLogin ? "Sign in to continue making an impact" : "Create an account to start recycling"}
            </Text>
          </View>

          {/* Wave shape */}
          <View style={styles.waveContainer}>
            <Svg height="45" width={width} viewBox="0 0 1440 120" preserveAspectRatio="none">
              <Path
                d="M0,90 C150,115 300,115 450,100 C600,85 750,55 900,55 C1050,55 1200,85 1440,90 L1440,120 L0,120 Z"
                fill={theme.colors.canvas.primary}
              />
            </Svg>
          </View>
        </LinearGradient>

        {/* Content Section */}
        <View style={styles.content}>

          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              onPress={() => setIsLogin(true)}
              style={[
                styles.segmentButton,
                isLogin && styles.segmentButtonActive,
              ]}
            >
              <Text style={[
                styles.segmentText,
                isLogin ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsLogin(false)}
              style={[
                styles.segmentButton,
                !isLogin && styles.segmentButtonActive,
              ]}
            >
              <Text style={[
                styles.segmentText,
                !isLogin ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Forms */}
          {isLogin ? <LoginForm /> : <RegisterForm onSuccess={() => setIsLogin(true)} />}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            <Button
              title={isGoogleLoading ? "Connecting…" : "Continue with Google"}
              variant="secondary"
              size="lg"
              onPress={handleGoogleLogin}
              loading={isGoogleLoading}
              icon={!isGoogleLoading && <FontAwesome5 name="google" size={18} color="#EA4335" />}
              iconPosition="left"
              hapticFeedback={false}
            />

            <Button
              title="Apple"
              variant="secondary"
              size="lg"
              onPress={() => {}}
              icon={<FontAwesome5 name="apple" size={20} color={theme.colors.text.primary} />}
              iconPosition="left"
              hapticFeedback={false}
            />
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    width: '100%',
    paddingTop: theme.spacing['6xl'],
    paddingBottom: theme.spacing['5xl'],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 350,
    overflow: 'hidden',
  },
  leafContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: theme.spacing['4xl'],
    marginBottom: theme.spacing['2xl'],
    zIndex: 10,
  },
  headerTitle: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize['4xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    marginTop: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.regular,
    marginTop: theme.spacing.xs,
    opacity: 0.85,
  },
  waveContainer: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    zIndex: 20,
  },
  segmentedControl: {
    width: '100%',
    height: 48,
    backgroundColor: theme.colors.canvas.tertiary,
    borderRadius: theme.radius.full,
    padding: theme.spacing.xs,
    flexDirection: 'row',
    marginBottom: theme.spacing['2xl'],
  },
  segmentButton: {
    flex: 1,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.canvas.primary,
  },
  segmentText: {
    fontSize: theme.typography.fontSize.base.size,
  },
  segmentTextActive: {
    color: theme.colors.green[700],
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  segmentTextInactive: {
    color: theme.colors.text.quaternary,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.canvas.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.green[600],
    borderColor: theme.colors.green[600],
  },
  rememberMeText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  forgotPasswordText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.green[700],
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
  roleSection: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  roleLabel: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.green[700],
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  roleButton: {
    width: '48%',
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.canvas.tertiary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  roleButtonFull: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.canvas.tertiary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  roleButtonActive: {
    borderColor: theme.colors.green[600],
    backgroundColor: theme.colors.green[50],
  },
  roleButtonText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  roleButtonTextActive: {
    color: theme.colors.green[600],
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  termsText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  termsLink: {
    color: theme.colors.green[600],
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: theme.spacing['2xl'],
    gap: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border.default,
  },
  dividerText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.disabled,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialButtons: {
    width: '100%',
    gap: theme.spacing.lg,
  },
});
