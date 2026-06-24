import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthProvider";

const LoginForm = () => {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "Invalid credentials. Please try again.";
      Alert.alert("Login Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex flex-col gap-5 w-full">
      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Email</Text>
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4 focus:border-[#27AE60]">
          <MaterialIcons name="mail-outline" size={20} color="#6d7a6e" className="mr-3" />
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
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4 focus:border-[#27AE60]">
          <MaterialIcons name="lock-outline" size={20} color="#6d7a6e" className="mr-3" />
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

      <TouchableOpacity activeOpacity={0.8} onPress={handleLogin} disabled={isLoading} className="mt-2 w-full shadow-sm">
        <LinearGradient
          colors={isLoading ? ["#8DE3A6", "#8DE3A6"] : ["#27AE60", "#2ECC71"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 100 }}
          className="w-full h-[54px] items-center justify-center flex-row"
        >
          {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white p-3 text-center font-semibold text-[16px]">Sign In</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default LoginForm;