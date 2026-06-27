import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router"; // 1. Import useRouter
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import PostService, { Post } from "../../../../services/post.service"; // Adjust path to where you saved it

// --- Category Data ---
const CATEGORIES = [
  { id: "all", name: "All", icon: "view-grid" },
  { id: "plastic", name: "Plastic", icon: "recycle" },
  { id: "organic", name: "Organic", icon: "leaf" },
  { id: "glass", name: "Glass", icon: "bottle-wine-outline" },
  { id: "metal", name: "Metal", icon: "cube-scan" },
];

// Helper to get the correct icon based on category string
const getCategoryIcon = (categoryId?: string) => {
  const cat = CATEGORIES.find((c) => c.id === categoryId?.toLowerCase());
  return cat ? cat.icon : "package-variant-closed";
};

export default function BrowseScreen() {
  const router = useRouter(); // 2. Initialize router
  const [activeCategory, setActiveCategory] = useState("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch posts from backend whenever the active category changes
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        // If 'all' is selected, don't send a category filter to the backend
        const query =
          activeCategory === "all" ? {} : { category: activeCategory };

        const response = await PostService.getAllPosts(query);
        setPosts(response.data);
        console.log(response.data[0].images[0].url);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [activeCategory]);

  posts.map((item) => {
    // 1. Get the URL and use .trim() to kill hidden whitespace!
    let rawUrl = item.images?.[0]?.url?.trim();

    // 2. Fallback if empty
    if (!rawUrl) {
      rawUrl =
        "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";
    } else if (
      rawUrl.includes("cloudinary.com") &&
      rawUrl.startsWith("http://")
    ) {
      rawUrl = rawUrl.replace("http://", "https://");
    }

    const displayImage = rawUrl;
    console.log(displayImage);
  });
  return (
    <SafeAreaView
      className="flex-1 bg-[#FAFAFA]"
      style={{ paddingTop: Platform.OS === "android" ? 40 : 0 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="px-6 pt-4 pb-5">
          <Text className="text-[28px] font-bold text-[#1E5631] tracking-tight">
            Browse Waste
          </Text>
        </View>

        {/* Search Bar */}
        <View className="px-6 pb-6">
          <View
            className="w-full h-[52px] bg-white rounded-2xl flex-row items-center px-4 border border-[#ECECEC]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Feather name="search" size={20} color="#8A8F87" />
            <TextInput
              placeholder="Search waste materials..."
              placeholderTextColor="#8A8F87"
              className="flex-1 ml-3 text-[15px] text-[#1b1c1c]"
            />
          </View>
        </View>

        {/* Categories ScrollView */}
        <View className="pl-6 pb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  className="items-center mr-5"
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-16 h-16 rounded-full items-center justify-center mb-2 
                    ${isActive ? "bg-[#2ECC71]" : "bg-white border border-[#ECECEC]"}`}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={28}
                      color={isActive ? "white" : "#1E5631"}
                    />
                  </View>
                  <Text
                    className={`text-[13px] font-semibold ${isActive ? "text-[#1E5631]" : "text-[#8A8F87]"}`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Waste Items Grid */}
        <View className="px-6 flex-row flex-wrap justify-between">
          {isLoading ? (
            <View className="w-full items-center justify-center py-10">
              <ActivityIndicator size="large" color="#2ECC71" />
            </View>
          ) : posts.length === 0 ? (
            <View className="w-full items-center justify-center py-10">
              <Text className="text-[#8A8F87] text-[15px]">
                No items found in this category.
              </Text>
            </View>
          ) : (
            posts.map((item) => {
              // 1. Get the URL and use .trim() to kill hidden whitespace!
              let rawUrl = item.images?.[0]?.url?.trim();

              // 2. Fallback if empty
              if (!rawUrl) {
                rawUrl =
                  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";
              } else if (
                rawUrl.includes("cloudinary.com") &&
                rawUrl.startsWith("http://")
              ) {
                rawUrl = rawUrl.replace("http://", "https://");
              }

              const displayImage = rawUrl;

              const weight = (item as any).weight || "TBD kg";
              const isFree = (item as any).price === 0 || !(item as any).price;
              const badgeText = isFree ? "FREE" : `$${(item as any).price}`;

              const formattedDate = new Date(item.createdAt).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
              );

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/citizen/${item.id}`)}
                  className="w-[48%] bg-white rounded-[24px] p-2.5 mb-4 border border-[#ECECEC]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {/* Image Container - Notice we keep h-36 (144px) here */}
                  <View className="w-full h-36 rounded-[18px] overflow-hidden mb-3 relative bg-[#F9F9F9]">
                    {/* THE FIX: Explicit React Native numeric styles, bypassing NativeWind quirks */}
                    <View
                      style={{
                        width: "100%",
                        height: 144,
                        backgroundColor: "gray",
                        overflow: "hidden",
                        borderRadius: 18,
                        marginBottom: 12,
                      }}
                    >
                      {/* Test 1: Hardcoded Unsplash URL */}
                      <Image
                        source={{ uri: displayImage }}
                        style={{ width: "100%", height: 144 }}
                        contentFit="cover"
                      />
                    </View>

                    {/* Price/Free Badge */}
                    <View
                      className={`absolute top-2 right-2 px-2.5 py-1 rounded-md z-10
                      ${isFree ? "bg-[#2ECC71]" : "bg-[#F1C40F]"}`}
                    >
                      <Text className="text-white text-[10px] font-bold tracking-wider">
                        {badgeText}
                      </Text>
                    </View>

                    {/* Category Icon Badge */}
                    <View className="absolute bottom-2 left-2 w-8 h-8 bg-white rounded-full items-center justify-center shadow-sm z-10">
                      <MaterialCommunityIcons
                        name={getCategoryIcon(item.category) as any}
                        size={16}
                        color="#1E5631"
                      />
                    </View>
                  </View>

                  {/* Text Info */}
                  <View className="px-1 pb-1">
                    <Text
                      className="text-[14px] font-semibold text-[#1b1c1c] mb-1.5"
                      numberOfLines={1}
                    >
                      {(item as any).title || "Untitled Material"}
                    </Text>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-[12px] text-[#3d4a3f] font-medium">
                        {weight}
                      </Text>
                      <Text className="text-[11px] text-[#8A8F87]">
                        {formattedDate}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
