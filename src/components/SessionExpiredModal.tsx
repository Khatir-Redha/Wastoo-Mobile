import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";

interface SessionExpiredModalProps {
  visible: boolean;
  onLogin: () => void;
}

export default function SessionExpiredModal({
  visible,
  onLogin,
}: SessionExpiredModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
        <View className="bg-white rounded-[24px] p-7 w-full max-w-[360px] items-center">
          <View className="w-16 h-16 rounded-full bg-[#E8F8EE] items-center justify-center mb-4">
            <Feather name="clock" size={30} color="#1E5631" />
          </View>

          <Text className="text-[20px] font-bold text-[#1b1c1c] text-center mb-2">
            Session Expired
          </Text>

          <Text className="text-[14px] text-[#6D7A6E] text-center leading-6 mb-6">
            Your login session has expired for security reasons. Please log in
            again to continue using Wastoo.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onLogin}
            className="w-full h-[54px] bg-[#1E5631] rounded-full items-center justify-center shadow-sm"
          >
            <Text className="text-white text-[16px] font-bold">
              Log In Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
