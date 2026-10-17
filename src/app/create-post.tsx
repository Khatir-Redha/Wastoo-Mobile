import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import PostService from "../../services/post.service";
import PickupLocationMap, {
  PickupLocation,
} from "../components/map/PickupLocationMap";

const CATEGORIES = [
  { id: "PLASTIC", name: "Plastic", icon: "bottle-tonic-outline" },
  { id: "ORGANIC", name: "Organic", icon: "leaf" },
  { id: "GLASS", name: "Glass", icon: "bottle-wine-outline" },
  { id: "METAL", name: "Metal", icon: "trash-can-outline" },
  { id: "PAPER", name: "Paper", icon: "file-document-outline" },
];

interface UploadedImage {
  url: string;
  publicId: string;
}

export default function CreatePostScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("ORGANIC");
  const [weight, setWeight] = useState(2.5);
  const [isSelling, setIsSelling] = useState(false);
  const [price, setPrice] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [backendLocation] = useState<PickupLocation | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PickupLocation | null>(null);

  const uploadPickedImages = async (uris: string[]) => {
    setIsUploading(true);
    try {
      const results = await Promise.all(
        uris.map((uri) => PostService.uploadImage(uri)),
      );
      setImages((prev) => [...prev, ...results]);
    } catch (error) {
      console.error("Image upload failed:", error);
      Alert.alert("Upload Failed", "Could not upload one or more images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      await uploadPickedImages(result.assets.map((a) => a.uri));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      await uploadPickedImages(result.assets.map((a) => a.uri));
    }
  };

  const removeImage = async (image: UploadedImage) => {
    setImages((prev) => prev.filter((img) => img.publicId !== image.publicId));
    try {
      await PostService.deleteImage(image.publicId);
    } catch (error) {
      console.error("Failed to delete image from Cloudinary:", error);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please give your listing a title.");
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert("Title Too Short", "Title must be at least 3 characters.");
      return;
    }
    if (!category) {
      Alert.alert("Missing Category", "Please select a waste category.");
      return;
    }
    if (images.length === 0) {
      Alert.alert("Missing Photos", "Please add at least one photo.");
      return;
    }
    if (
      !selectedLocation ||
      typeof selectedLocation.latitude !== "number" ||
      typeof selectedLocation.longitude !== "number" ||
      !isFinite(selectedLocation.latitude) ||
      !isFinite(selectedLocation.longitude)
    ) {
      Alert.alert(
        "Location Required",
        "Please select a pickup location on the map before publishing."
      );
      return;
    }

    setIsPublishing(true);
    try {
      const postData: any = {
        title: title.trim(),
        category,
        quantity: Number(weight) || 1,
        price: isSelling && price ? Number(price) : 0,
        images: images.map((img) => img.url),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      };

      if (description.trim().length >= 3) {
        postData.description = description.trim();
      }

      await PostService.createPost(postData);
      router.back();
    } catch (error: any) {
      console.error("Failed to publish listing:", error?.response?.data || error);
      const serverMessage = error?.response?.data?.message;
      const errorMsg = Array.isArray(serverMessage)
        ? serverMessage.join("\n")
        : (serverMessage || "Something went wrong. Please try again.");
      Alert.alert("Publish Failed", errorMsg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F6FAF7]" style={{ paddingTop: Platform.OS === "android" ? 40 : 0 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center px-4 py-3 border-b border-[#E2ECE6] bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <MaterialIcons name="arrow-back" size={24} color="#087F5B" />
          </TouchableOpacity>
          <Text className="text-[22px] font-bold text-[#087F5B] ml-2 tracking-tight">
            List Your Waste
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          className="flex-1 px-4 pt-4"
        >
          <View className="mb-6">
            <Text className="text-[18px] font-semibold text-[#172B2A] mb-3">
              Visuals
            </Text>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-3">
                  {images.map((img) => (
                    <View key={img.publicId} className="relative">
                      <Image
                        source={{ uri: img.url }}
                        style={{ width: 80, height: 80, borderRadius: 14 }}
                      />
                      <TouchableOpacity
                        onPress={() => removeImage(img)}
                        className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm"
                      >
                        <MaterialIcons name="cancel" size={20} color="#d32f2f" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={takePhoto}
                disabled={isUploading}
                className="flex-1 bg-[#f0f9f4] border-2 border-dashed border-[#27ae60] rounded-[20px] p-5 items-center justify-center"
              >
                <View className="bg-white p-3 rounded-full mb-2 shadow-sm">
                  <MaterialIcons name="photo-camera" size={24} color="#27ae60" />
                </View>
                <Text className="text-[13px] font-medium text-[#087F5B]">Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={pickFromGallery}
                disabled={isUploading}
                className="flex-1 bg-[#f0f9f4] border-2 border-dashed border-[#27ae60] rounded-[20px] p-5 items-center justify-center"
              >
                <View className="bg-white p-3 rounded-full mb-2 shadow-sm">
                  <MaterialIcons name="photo-library" size={24} color="#27ae60" />
                </View>
                <Text className="text-[13px] font-medium text-[#087F5B]">From Gallery</Text>
              </TouchableOpacity>
            </View>

            {isUploading && (
              <View className="flex-row items-center justify-center mt-3">
                <ActivityIndicator size="small" color="#27ae60" />
                <Text className="text-[12px] text-[#64756D] ml-2">Uploading...</Text>
              </View>
            )}
          </View>

          <View className="mb-6">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-[18px] font-semibold text-[#172B2A]">Title</Text>
              <View className="bg-[#e8f5e9] px-2 py-0.5 rounded">
                <Text className="text-[11px] font-medium text-[#087F5B]">Required</Text>
              </View>
            </View>
            <View className="bg-white rounded-[16px] p-3 border border-[#E2ECE6]">
              <TextInput
                className="text-[15px] text-[#172B2A]"
                placeholder="e.g. Clean PET bottles, 5kg"
                placeholderTextColor="#64756D"
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[18px] font-semibold text-[#172B2A] mb-3">
              Description
            </Text>
            <View className="bg-white rounded-[16px] p-3 border border-[#E2ECE6]">
              <TextInput
                className="text-[15px] text-[#172B2A]"
                placeholder="Add any extra details (optional)"
                placeholderTextColor="#64756D"
                multiline
                numberOfLines={3}
                style={{ minHeight: 72, textAlignVertical: "top" }}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <View className="mb-6">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-[18px] font-semibold text-[#172B2A]">Material Type</Text>
              <View className="bg-[#e8f5e9] px-2 py-0.5 rounded">
                <Text className="text-[11px] font-medium text-[#087F5B]">Required</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              <View className="flex-row gap-3">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      className="items-center"
                    >
                      <View
                        className={`w-[60px] h-[60px] rounded-[18px] items-center justify-center mb-1 border
                        ${isSelected ? "bg-[#f0f9f4] border-[#27ae60]" : "bg-white border-[#E2ECE6]"}`}
                      >
                        <MaterialCommunityIcons
                          name={cat.icon as any}
                          size={28}
                          color={isSelected ? "#087F5B" : "#3d4a3f"}
                        />
                      </View>
                      <Text className={`text-[12px] ${isSelected ? "text-[#087F5B] font-semibold" : "text-[#3d4a3f]"}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View className="mb-6 bg-white p-4 rounded-[20px] border border-[#E2ECE6]">
            <View className="items-center mb-2">
              <Text className="text-[11px] text-[#64756D] uppercase font-bold tracking-wider mb-1">
                Estimated Weight
              </Text>
              <View className="flex-row items-baseline">
                <Text className="text-[28px] font-bold text-[#087F5B]">{weight.toFixed(1)}</Text>
                <Text className="text-[16px] text-[#64756D] ml-1">kg</Text>
              </View>
            </View>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0.5}
              maximumValue={10}
              step={0.5}
              value={weight}
              onValueChange={setWeight}
              minimumTrackTintColor="#27ae60"
              maximumTrackTintColor="#E2ECE6"
              thumbTintColor="#ffffff"
            />
            <View className="flex-row justify-between px-1">
              <Text className="text-[11px] text-[#64756D]">0.5 kg</Text>
              <Text className="text-[11px] text-[#64756D]">10+ kg</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[18px] font-semibold text-[#172B2A] mb-3">
              Listing Type
            </Text>
            <View className="flex-row bg-[#E2ECE6] p-1 rounded-full h-12 mb-3">
              <TouchableOpacity
                onPress={() => setIsSelling(false)}
                className={`flex-1 flex-row items-center justify-center rounded-full ${!isSelling ? "bg-white" : ""}`}
                style={
                  !isSelling
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }
                    : undefined
                }
              >
                <MaterialIcons
                  name="volunteer-activism"
                  size={18}
                  color={!isSelling ? "#087F5B" : "#64756D"}
                />
                <Text
                  className={`ml-2 text-[14px] ${!isSelling ? "text-[#087F5B] font-semibold" : "text-[#64756D] font-medium"}`}
                >
                  Giveaway
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSelling(true)}
                className={`flex-1 flex-row items-center justify-center rounded-full ${isSelling ? "bg-white" : ""}`}
                style={
                  isSelling
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }
                    : undefined
                }
              >
                <MaterialIcons
                  name="payments"
                  size={18}
                  color={isSelling ? "#087F5B" : "#64756D"}
                />
                <Text
                  className={`ml-2 text-[14px] ${isSelling ? "text-[#087F5B] font-semibold" : "text-[#64756D] font-medium"}`}
                >
                  Sell for Cash
                </Text>
              </TouchableOpacity>
            </View>

            {isSelling && (
              <View className="bg-white rounded-[16px] p-4 border border-[#E2ECE6]">
                <Text className="text-[12px] text-[#3d4a3f] mb-2">Asking Price</Text>
                <View className="flex-row items-center border border-[#E2ECE6] rounded-[12px] bg-[#F6FAF7] h-12 px-3">
                  <Text className="text-[18px] text-[#3d4a3f] font-semibold">$</Text>
                  <TextInput
                    className="flex-1 text-[18px] font-semibold text-[#087F5B] ml-2 h-full"
                    placeholder="0.00"
                    placeholderTextColor="#64756D"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                  <View className="border-l border-[#E2ECE6] pl-3 py-1">
                    <Text className="text-[14px] text-[#64756D]">/ton</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View className="mb-6">
            <PickupLocationMap
              backendLocation={backendLocation}
              onLocationSelect={setSelectedLocation}
            />
          </View>
        </ScrollView>

        <View
          className="absolute bottom-0 w-full bg-white px-4 py-4 border-t border-[#E2ECE6]"
          style={{ paddingBottom: Platform.OS === "ios" ? 34 : 16 }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePublish}
            disabled={isPublishing || isUploading}
            className="w-full bg-[#087F5B] rounded-full h-14 flex-row justify-center items-center shadow-sm"
          >
            {isPublishing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="publish" size={22} color="white" />
                <Text className="text-white text-[16px] font-semibold ml-2">
                  Publish Listing
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}