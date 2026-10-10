import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PostService, { Post } from '../../../services/post.service';
import { Button, Card } from '../../components/ui';
import { theme } from '../../theme/tokens';

export default function CreatePickupScreen() {
  const router = useRouter();
  const { post_id } = useLocalSearchParams();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactNumber, setContactNumber] = useState('');
  const [accessNotes, setAccessNotes] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      if (!post_id) {
        setLoading(false);
        return;
      }
      try {
        const data = await PostService.getPostById(Number(post_id));
        setPost(data);
      } catch (err) {
        console.error('Failed to fetch post', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [post_id]);

  const handleContinue = () => {
    if (!contactNumber.trim()) {
      Alert.alert('Required', 'Please provide a valid contact number.');
      return;
    }

    router.push({
      pathname: '/pickups/schedule',
      params: {
        post_id: post_id,
        contact_number: contactNumber,
        access_notes: accessNotes
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Post not found</Text>
        <Button
          title="Go Back"
          variant="primary"
          onPress={() => router.back()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  const imageUrl = (post.images && post.images.length > 0)
    ? (typeof post.images[0] === 'string' ? post.images[0] : (post.images[0] as any).url)
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title=""
          variant="ghost"
          onPress={() => router.back()}
          icon={<Feather name="arrow-left" size={24} color={theme.colors.text.primary} />}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>Request Pickup</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Post Summary Card */}
        <Card variant="default" padding="md" style={styles.postCard}>
          <View style={styles.postCardContent}>
            <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
            <View style={styles.postInfo}>
              <Text style={styles.postTitle} numberOfLines={1}>
                {(post as any).title || 'Untitled Listing'}
              </Text>
              <View style={styles.postMeta}>
                <MaterialCommunityIcons name="recycle" size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.postMetaText}>
                  {post.category} • {(post as any).weight || 'TBD'} kg
                </Text>
              </View>
              <Text style={styles.postAddress} numberOfLines={1}>
                {(post as any).address || 'No location provided'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Contact Info Section */}
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Contact Number <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputContainer}>
            <Feather name="phone" size={20} color={theme.colors.text.quaternary} />
            <TextInput
              style={styles.input}
              placeholder="+213 555 123 456"
              placeholderTextColor={theme.colors.text.disabled}
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Access Notes (Optional)</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Ring the second bell, gate code is 1234, call upon arrival..."
              placeholderTextColor={theme.colors.text.disabled}
              multiline
              textAlignVertical="top"
              value={accessNotes}
              onChangeText={setAccessNotes}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          size="lg"
          onPress={handleContinue}
          icon={<Feather name="arrow-right" size={20} color={theme.colors.canvas.primary} />}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

// Import TextInput
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl.size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  errorButton: {
    marginTop: theme.spacing.lg,
  },
  header: {
    paddingHorizontal: theme.spacing.lg + 4,
    paddingTop: theme.spacing['4xl'],
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.canvas.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
  },
  postCard: {
    marginBottom: theme.spacing['2xl'],
  },
  postCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.tertiary,
  },
  postInfo: {
    flex: 1,
    marginLeft: theme.spacing.lg,
    justifyContent: 'center',
  },
  postTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg.size,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  postMetaText: {
    fontSize: theme.typography.fontSize.sm.size,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.fontFamily.regular,
    marginLeft: theme.spacing.xs,
  },
  postAddress: {
    fontSize: theme.typography.fontSize.sm.size,
    color: theme.colors.text.quaternary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl.size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.tertiary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    height: theme.componentSizes.input.lg.height,
  },
  textAreaContainer: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.md,
  },
  textArea: {
    marginLeft: 0,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.canvas.primary,
  },
});
