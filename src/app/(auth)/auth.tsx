import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthProvider"; 
import api from "../../../lib/api"; 

const { width } = Dimensions.get("window");

// ==========================================
// BACKGROUND LEAF ANIMATION
// ==========================================
const AnimatedLeaf = ({ config }) => {
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
  const { login , user } = useAuth();
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
      // No manual routing needed! Your root layout detects the session update and redirects automatically.
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "Invalid credentials. Please try again.";
      Alert.alert("Login Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex flex-col gap-5 w-full">
      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Email</Text>
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4">
          <MaterialIcons name="mail-outline" size={20} color="#6d7a6e" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[14px] ml-3"
            placeholder="Enter your email"
            placeholderTextColor="#bccabc"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Password</Text>
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4">
          <MaterialIcons name="lock-outline" size={20} color="#6d7a6e" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[14px] ml-3"
            placeholder="Enter your password"
            placeholderTextColor="#bccabc"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
            <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6d7a6e" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center justify-between w-full mt-1 mb-2">
        <TouchableOpacity className="flex-row items-center gap-2" onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
          <View className={`w-5 h-5 rounded border items-center justify-center ${rememberMe ? "bg-[#27AE60] border-[#27AE60]" : "bg-[#F9F9F9] border-[#ECECEC]"}`}>
            {rememberMe && <MaterialIcons name="check" size={14} color="white" />}
          </View>
          <Text className="text-[13px] text-[#3d4a3f]">Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text className="text-[13px] font-medium text-[#1E5631]">Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={handleLogin} disabled={isSubmitting} className="mt-2 w-full">
        <LinearGradient
          colors={isSubmitting ? ["#8DE3A6", "#8DE3A6"] : ["#27AE60", "#2ECC71"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 100 }}
          className="w-full h-[54px] items-center justify-center flex-row"
        >
          {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white p-3 text-center font-semibold text-[16px]">Sign In</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ==========================================
// REGISTRATION FORM COMPONENT
// ==========================================
const RegisterForm = ({ onSuccess }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Citizen");
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
      // Syncing with Web payload format: includes the user role
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

  return (
    <View className="flex flex-col gap-5 w-full">
      {/* Full Name */}
      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Full Name</Text>
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4">
          <MaterialIcons name="person-outline" size={20} color="#6d7a6e" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[14px] ml-3"
            placeholder="Karim Benali"
            placeholderTextColor="#bccabc"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      {/* Email */}
      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Email</Text>
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4">
          <MaterialIcons name="mail-outline" size={20} color="#6d7a6e" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[14px] ml-3"
            placeholder="you@example.com"
            placeholderTextColor="#bccabc"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      {/* Password */}
      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Password</Text>
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4">
          <MaterialIcons name="lock-outline" size={20} color="#6d7a6e" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[14px] ml-3"
            placeholder="Min. 8 characters"
            placeholderTextColor="#bccabc"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
            <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6d7a6e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password */}
      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Confirm Password</Text>
        <View className={`w-full h-[52px] bg-[#F9F9F9] border rounded-2xl flex-row items-center px-4 ${password && confirmPassword && password !== confirmPassword ? "border-red-400" : "border-[#ECECEC]"}`}>
          <MaterialIcons name="lock-outline" size={20} color={password && confirmPassword && password !== confirmPassword ? "#ef4444" : "#6d7a6e"} />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[14px] ml-3"
            placeholder="••••••••"
            placeholderTextColor="#bccabc"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
            <MaterialIcons name={showConfirmPassword ? "visibility" : "visibility-off"} size={20} color="#6d7a6e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Role Selection Grid */}
      <View className="flex flex-col gap-2 mt-1">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">I am a...</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          <TouchableOpacity 
            onPress={() => setSelectedRole("CITIZEN")} 
            className={`w-[48%] h-[48px] border rounded-xl flex-row items-center justify-center gap-2 ${selectedRole === "Citizen" ? "border-[#27AE60] bg-[#27AE60]/10" : "border-[#ECECEC] bg-[#F9F9F9]"}`}
          >
            <FontAwesome5 name="leaf" size={15} color={selectedRole === "CITIZEN" ? "#27AE60" : "#6d7a6e"} />
            <Text className={`text-[13px] font-medium ${selectedRole === "CITIZEN" ? "text-[#27AE60]" : "text-[#1b1c1c]"}`}>Citizen</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSelectedRole("COLLECTOR")} 
            className={`w-[48%] h-[48px] border rounded-xl flex-row items-center justify-center gap-2 ${selectedRole === "Collector" ? "border-[#27AE60] bg-[#27AE60]/10" : "border-[#ECECEC] bg-[#F9F9F9]"}`}
          >
            <FontAwesome5 name="truck" size={14} color={selectedRole === "COLLECTOR" ? "#27AE60" : "#6d7a6e"} />
            <Text className={`text-[13px] font-medium ${selectedRole === "COLLECTOR" ? "text-[#27AE60]" : "text-[#1b1c1c]"}`}>Collector</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSelectedRole("RECYCLING_CENTER")} 
            className={`w-full h-[48px] border rounded-xl flex-row items-center justify-center gap-2 ${selectedRole === "Recycling Centre" ? "border-[#27AE60] bg-[#27AE60]/10" : "border-[#ECECEC] bg-[#F9F9F9]"}`}
          >
            <FontAwesome5 name="industry" size={15} color={selectedRole === "RECYCLING_CENTER" ? "#27AE60" : "#6d7a6e"} />
            <Text className={`text-[13px] font-medium ${selectedRole === "RECYCLING_CENTER" ? "text-[#27AE60]" : "text-[#1b1c1c]"}`}>Recycling Centre</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Terms Checkbox */}
      <TouchableOpacity 
        className="flex-row items-center gap-3 mt-1" 
        onPress={() => setAgreeTerms(!agreeTerms)} 
        activeOpacity={0.7}
      >
        <View className={`w-5 h-5 rounded border items-center justify-center ${agreeTerms ? "bg-[#27AE60] border-[#27AE60]" : "bg-[#F9F9F9] border-[#ECECEC]"}`}>
          {agreeTerms && <MaterialIcons name="check" size={14} color="white" />}
        </View>
        <Text className="text-[12px] text-[#3d4a3f] flex-1 leading-4">
          I agree to the <Text className="text-[#27AE60] font-semibold">Terms of Service</Text> and <Text className="text-[#27AE60] font-semibold">Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity activeOpacity={0.8} onPress={handleRegister} disabled={isSubmitting} className="mt-4 w-full">
        <LinearGradient
          colors={isSubmitting ? ["#8DE3A6", "#8DE3A6"] : ["#27AE60", "#2ECC71"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 100 }}
          className="w-full h-[54px] items-center justify-center flex-row"
        >
          {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white p-3 text-center font-semibold text-[16px]">Create Account</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ==========================================
// MAIN SCREEN EXPORT
// ==========================================
export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#27AE60" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        
        <LinearGradient colors={["#27AE60", "#2ECC71"]} className="w-full pt-24 pb-16 items-center justify-center relative min-h-[350px] overflow-hidden">
          <View className="absolute inset-0 z-0">
            {leaves.map((config) => (
              <AnimatedLeaf key={config.id} config={config} />
            ))}
          </View>

          <View className="items-center mt-12 mb-8 z-10">
            <MaterialIcons name="recycling" size={64} color="white" />
            <Text className="text-white text-[28px] font-bold mt-2 tracking-tight">
              {isLogin ? "Welcome back" : "Join Wasto"}
            </Text>
            <Text className="text-white/85 text-[14px] mt-1">
              {isLogin ? "Sign in to continue making an impact" : "Create an account to start recycling"}
            </Text>
          </View>

          <View className="absolute bottom-[-1px] left-0 right-0 z-10">
            <Svg height="45" width={width} viewBox="0 0 1440 120" preserveAspectRatio="none">
              <Path d="M0,90 C150,115 300,115 450,100 C600,85 750,55 900,55 C1050,55 1200,85 1440,90 L1440,120 L0,120 Z" fill="#ffffff" />
            </Svg>
          </View>
        </LinearGradient>

        <View className="flex-1 bg-white px-6 pt-4 pb-8 z-20">
          
          <View className="w-full h-12 bg-[#f0eded] rounded-full p-1 flex-row mb-8">
            <TouchableOpacity onPress={() => setIsLogin(true)} className={`flex-1 rounded-full items-center justify-center ${isLogin ? 'bg-white' : ''}`}>
              <Text className={`font-semibold text-[14px] ${isLogin ? 'text-[#1E5631]' : 'text-[#8A8F87]'}`}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsLogin(false)} className={`flex-1 rounded-full items-center justify-center ${!isLogin ? 'bg-white' : ''}`}>
              <Text className={`font-semibold text-[14px] ${!isLogin ? 'text-[#1E5631]' : 'text-[#8A8F87]'}`}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {isLogin ? <LoginForm /> : <RegisterForm onSuccess={() => setIsLogin(true)} />}

          <View className="w-full flex-row items-center gap-4 my-8">
            <View className="flex-1 h-[1px] bg-[#ECECEC]" />
            <Text className="text-[10px] text-[#bccabc] uppercase tracking-wider font-medium">or continue with</Text>
            <View className="flex-1 h-[1px] bg-[#ECECEC]" />
          </View>

          <View className="flex flex-col gap-4 w-full">
            <TouchableOpacity activeOpacity={0.7} className="w-full h-[52px] bg-white border border-[#ECECEC] rounded-2xl flex-row items-center justify-center gap-3">
              <FontAwesome5 name="google" size={18} color="#EA4335" />
              <Text className="text-[#1b1c1c] font-medium text-[14px]">Google</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} className="w-full h-[52px] bg-white border border-[#ECECEC] rounded-2xl flex-row items-center justify-center gap-3">
              <FontAwesome5 name="apple" size={20} color="#1b1c1c" />
              <Text className="text-[#1b1c1c] font-medium text-[14px]">Apple</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}