import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import PostService from '../../services/post.service';

const CATEGORIES = [
  { id: 'PLASTIC', name: 'Plastic', icon: 'bottle-tonic-outline' },
  { id: 'ORGANIC', name: 'Organic', icon: 'leaf' },
  { id: 'GLASS', name: 'Glass', icon: 'bottle-wine-outline' },
  { id: 'METAL', name: 'Metal', icon: 'trash-can-outline' },
  { id: 'PAPER', name: 'Paper', icon: 'file-document-outline' },
];

// Tracks both the uploaded URL (sent to API) and the Cloudinary publicId (needed to delete)
interface UploadedImage {
  url: string;
  publicId: string;
}

export default function CreatePostScreen() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ORGANIC');
  const [weight, setWeight] = useState(2.5);
  const [isSelling, setIsSelling] = useState(false); // false = Giveaway, true = Sell
  const [price, setPrice] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Image state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadPickedImages = async (uris: string[]) => {
    setIsUploading(true);
    try {
      const results = await Promise.all(
        uris.map((uri) => PostService.uploadImage(uri))
      );
      setImages((prev) => [...prev, ...results]);
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Upload Failed', 'Could not upload one or more images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
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
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
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
    // Optimistically remove from UI first
    setImages((prev) => prev.filter((img) => img.publicId !== image.publicId));
    try {
      await PostService.deleteImage(image.publicId);
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
      // Not re-adding to UI; the image is just orphaned in Cloudinary, not critical
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give your listing a title.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Missing Photos', 'Please add at least one photo.');
      return;
    }

    setIsPublishing(true);
    try {
      const postData = {
        title,
        category,
        description,
        quantity: Number(weight),
        images: images.map((img) => img.url),
      };

      await PostService.createPost(postData);
      router.back();
    } catch (error) {
      console.error('Failed to publish listing:', error);
      Alert.alert('Publish Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-[#ECECEC] bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <MaterialIcons name="arrow-back" size={24} color="#006d37" />
          </TouchableOpacity>
          <Text className="text-[22px] font-bold text-[#006d37] ml-2 tracking-tight">List Your Waste</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          className="flex-1 px-4 pt-4"
        >
          {/* 1. Visuals */}
          <View className="mb-6">
            <Text className="text-[18px] font-semibold text-[#1b1c1c] mb-3">Visuals</Text>

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
                <Text className="text-[13px] font-medium text-[#006d37]">Take Photo</Text>
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
                <Text className="text-[13px] font-medium text-[#006d37]">From Gallery</Text>
              </TouchableOpacity>
            </View>

            {isUploading && (
              <View className="flex-row items-center justify-center mt-3">
                <ActivityIndicator size="small" color="#27ae60" />
                <Text className="text-[12px] text-[#8A8F87] ml-2">Uploading...</Text>
              </View>
            )}
          </View>

          {/* 2. Title */}
          <View className="mb-6">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-[18px] font-semibold text-[#1b1c1c]">Title</Text>
              <View className="bg-[#e8f5e9] px-2 py-0.5 rounded">
                <Text className="text-[11px] font-medium text-[#006d37]">Required</Text>
              </View>
            </View>
            <View className="bg-white rounded-[16px] p-3 border border-[#ECECEC]">
              <TextInput
                className="text-[15px] text-[#1b1c1c]"
                placeholder="e.g. Clean PET bottles, 5kg"
                placeholderTextColor="#8A8F87"
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          {/* 3. Description */}
          <View className="mb-6">
            <Text className="text-[18px] font-semibold text-[#1b1c1c] mb-3">Description</Text>
            <View className="bg-white rounded-[16px] p-3 border border-[#ECECEC]">
              <TextInput
                className="text-[15px] text-[#1b1c1c]"
                placeholder="Add any extra details (optional)"
                placeholderTextColor="#8A8F87"
                multiline
                numberOfLines={3}
                style={{ minHeight: 72, textAlignVertical: 'top' }}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* 4. Material Type */}
          <View className="mb-6">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-[18px] font-semibold text-[#1b1c1c]">Material Type</Text>
              <View className="bg-[#e8f5e9] px-2 py-0.5 rounded">
                <Text className="text-[11px] font-medium text-[#006d37]">Required</Text>
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
                      <View className={`w-[60px] h-[60px] rounded-[18px] items-center justify-center mb-1 border
                        ${isSelected ? 'bg-[#f0f9f4] border-[#27ae60]' : 'bg-white border-[#ECECEC]'}`}
                      >
                        <MaterialCommunityIcons
                          name={cat.icon as any}
                          size={28}
                          color={isSelected ? '#006d37' : '#3d4a3f'}
                        />
                      </View>
                      <Text className={`text-[12px] ${isSelected ? 'text-[#006d37] font-semibold' : 'text-[#3d4a3f]'}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* 5. Estimated Weight */}
          <View className="mb-6 bg-white p-4 rounded-[20px] border border-[#ECECEC]">
            <View className="items-center mb-2">
              <Text className="text-[11px] text-[#8A8F87] uppercase font-bold tracking-wider mb-1">Estimated Weight</Text>
              <View className="flex-row items-baseline">
                <Text className="text-[28px] font-bold text-[#006d37]">{weight.toFixed(1)}</Text>
                <Text className="text-[16px] text-[#8A8F87] ml-1">kg</Text>
              </View>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0.5}
              maximumValue={10}
              step={0.5}
              value={weight}
              onValueChange={setWeight}
              minimumTrackTintColor="#27ae60"
              maximumTrackTintColor="#ECECEC"
              thumbTintColor="#ffffff"
            />
            <View className="flex-row justify-between px-1">
              <Text className="text-[11px] text-[#8A8F87]">0.5 kg</Text>
              <Text className="text-[11px] text-[#8A8F87]">10+ kg</Text>
            </View>
          </View>

          {/* 6. Listing Type */}
          <View className="mb-6">
            <Text className="text-[18px] font-semibold text-[#1b1c1c] mb-3">Listing Type</Text>
            <View className="flex-row bg-[#ECECEC] p-1 rounded-full h-12 mb-3">
              <TouchableOpacity
                onPress={() => setIsSelling(false)}
                className={`flex-1 flex-row items-center justify-center rounded-full ${!isSelling ? 'bg-white' : ''}`}
                style={!isSelling ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}
              >
                <MaterialIcons name="volunteer-activism" size={18} color={!isSelling ? '#006d37' : '#8A8F87'} />
                <Text className={`ml-2 text-[14px] ${!isSelling ? 'text-[#006d37] font-semibold' : 'text-[#8A8F87] font-medium'}`}>
                  Giveaway
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSelling(true)}
                className={`flex-1 flex-row items-center justify-center rounded-full ${isSelling ? 'bg-white' : ''}`}
                style={isSelling ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}
              >
                <MaterialIcons name="payments" size={18} color={isSelling ? '#006d37' : '#8A8F87'} />
                <Text className={`ml-2 text-[14px] ${isSelling ? 'text-[#006d37] font-semibold' : 'text-[#8A8F87] font-medium'}`}>
                  Sell for Cash
                </Text>
              </TouchableOpacity>
            </View>

            {isSelling && (
              <View className="bg-white rounded-[16px] p-4 border border-[#ECECEC]">
                <Text className="text-[12px] text-[#3d4a3f] mb-2">Asking Price</Text>
                <View className="flex-row items-center border border-[#ECECEC] rounded-[12px] bg-[#FAFAFA] h-12 px-3">
                  <Text className="text-[18px] text-[#3d4a3f] font-semibold">$</Text>
                  <TextInput
                    className="flex-1 text-[18px] font-semibold text-[#006d37] ml-2 h-full"
                    placeholder="0.00"
                    placeholderTextColor="#8A8F87"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                  <View className="border-l border-[#ECECEC] pl-3 py-1">
                    <Text className="text-[14px] text-[#8A8F87]">/ton</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 7. Pickup Location */}
          <View className="mb-6">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-[18px] font-semibold text-[#1b1c1c]">Pickup Location</Text>
              <TouchableOpacity className="flex-row items-center">
                <MaterialIcons name="edit" size={14} color="#006d37" />
                <Text className="text-[12px] text-[#006d37] font-medium ml-1">Edit</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-white rounded-[20px] border border-[#ECECEC] overflow-hidden">
              <View className="h-28 bg-[#E4E9F2] items-center justify-center">
                <View className="bg-[#27ae60] p-1.5 rounded-full shadow-sm">
                  <MaterialIcons name="location-on" size={20} color="white" />
                </View>
              </View>
              <View className="p-3 flex-row items-center bg-white">
                <MaterialIcons name="my-location" size={20} color="#006d37" />
                <View className="ml-3">
                  <Text className="text-[14px] text-[#1b1c1c] font-medium">1428 Elm Street</Text>
                  <Text className="text-[12px] text-[#8A8F87]">Seattle, WA 98101</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View className="absolute bottom-0 w-full bg-white px-4 py-4 border-t border-[#ECECEC]" style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 16 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePublish}
            disabled={isPublishing || isUploading}
            className="w-full bg-[#006d37] rounded-full h-14 flex-row justify-center items-center shadow-sm"
          >
            {isPublishing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="publish" size={22} color="white" />
                <Text className="text-white text-[16px] font-semibold ml-2">Publish Listing</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}