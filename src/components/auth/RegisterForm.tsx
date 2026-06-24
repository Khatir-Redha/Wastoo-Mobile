import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import api from "../../../lib/api";

interface RegisterFormProps {
  onSuccess: () => void;
}

const RegisterForm = ({ onSuccess }: RegisterFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/register", { name, email, password });
      Alert.alert("Success!", "Your account has been created. Please sign in.");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "An error occurred during registration.";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex flex-col gap-5 w-full">
      <View className="flex flex-col gap-1.5">
        <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Full Name</Text>
        <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4 focus:border-[#27AE60]">
          <MaterialIcons name="person-outline" size={20} color="#6d7a6e" className="mr-3" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[14px] ml-3"
            placeholder="Enter your full name"
            placeholderTextColor="#bccabc"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

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
            placeholder="Create a password"
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

      <TouchableOpacity activeOpacity={0.8} onPress={handleRegister} disabled={isLoading} className="mt-6 w-full shadow-sm">
        <LinearGradient
          colors={isLoading ? ["#8DE3A6", "#8DE3A6"] : ["#27AE60", "#2ECC71"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 100 }}
          className="w-full h-[54px] items-center justify-center flex-row"
        >
          {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white p-3 text-center font-semibold text-[16px]">Create Account</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default RegisterForm;