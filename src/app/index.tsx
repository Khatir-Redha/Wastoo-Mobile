import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <StatusBar barStyle="light-content" backgroundColor="#27AE60" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Section */}
        <LinearGradient
          colors={['#27AE60', '#2ECC71']}
          className="w-full pt-20 pb-12 items-center justify-center relative min-h-[300px]"
        >
          {/* Logo & Text Stack */}
          <View className="items-center z-10">
            <MaterialIcons name="recycling" size={64} color="white" />
            <Text className="text-white text-[28px] font-bold mt-2 tracking-tight">
              Welcome back
            </Text>
            <Text className="text-white/85 text-[14px] mt-1">
              Sign in to continue making an impact
            </Text>
          </View>

          {/* SVG Wave Divider */}
          <View className="absolute bottom-[-1px] left-0 right-0">
            <Svg height="40" width="100%" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <Path
                d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C52.16,112.5,105.4,115.1,159.2,111.4,213,107.7,267.8,97.3,321.39,56.44Z"
                fill="#ffffff"
              />
            </Svg>
          </View>
        </LinearGradient>

        {/* Main Content Body */}
        <View className="flex-1 bg-white px-6 pt-4 pb-8">
          {/* Tab Toggle */}
          <View className="w-full h-12 bg-[#f0eded] rounded-full p-1 flex-row mb-8">
            <TouchableOpacity className="flex-1 bg-white rounded-full items-center justify-center shadow-sm">
              <Text className="text-[#1E5631] font-semibold text-[14px]">Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 rounded-full items-center justify-center">
              <Text className="text-[#8A8F87] font-medium text-[14px]">Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Form Area */}
          <View className="flex flex-col gap-5 w-full">
            {/* Email Input */}
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

            {/* Password Input */}
            <View className="flex flex-col gap-1.5">
              <Text className="text-[#1E5631] text-[12px] font-medium ml-1">Password</Text>
              <View className="w-full h-[52px] bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl flex-row items-center px-4">
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
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#6d7a6e"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password */}
            <View className="flex-row items-center justify-between w-full mt-1 mb-2">
              <TouchableOpacity
                className="flex-row items-center gap-2"
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View
                  className={`w-5 h-5 rounded border items-center justify-center ${
                    rememberMe ? 'bg-[#27AE60] border-[#27AE60]' : 'bg-[#F9F9F9] border-[#ECECEC]'
                  }`}
                >
                  {rememberMe && <MaterialIcons name="check" size={14} color="white" />}
                </View>
                <Text className="text-[13px] text-[#3d4a3f]">Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-[13px] font-medium text-[#1E5631]">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity activeOpacity={0.8} className="mt-2 shadow-sm">
              <LinearGradient
                colors={['#27AE60', '#2ECC71']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full h-[54px] rounded-full items-center justify-center"
              >
                <Text className="text-white font-semibold text-[16px]">Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="w-full flex-row items-center gap-4 my-8">
            <View className="flex-1 h-[1px] bg-[#ECECEC]" />
            <Text className="text-[10px] text-[#bccabc] uppercase tracking-wider font-medium">
              or continue with
            </Text>
            <View className="flex-1 h-[1px] bg-[#ECECEC]" />
          </View>

          {/* Social Buttons */}
          <View className="flex flex-col gap-4 w-full">
            <TouchableOpacity
              activeOpacity={0.7}
              className="w-full h-[52px] bg-white border border-[#ECECEC] rounded-2xl flex-row items-center justify-center gap-3"
            >
              <FontAwesome5 name="google" size={18} color="#EA4335" />
              <Text className="text-[#1b1c1c] font-medium text-[14px]">Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="w-full h-[52px] bg-white border border-[#ECECEC] rounded-2xl flex-row items-center justify-center gap-3"
            >
              <FontAwesome5 name="apple" size={20} color="#1b1c1c" />
              <Text className="text-[#1b1c1c] font-medium text-[14px]">Apple</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}