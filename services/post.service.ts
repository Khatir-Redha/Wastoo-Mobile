import api from '../lib/api'; // Adjust the import path to your Axios instance

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface GetPostsQueryDto {
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreatePostDto {
  title: string;
  description: string;
  category: string;
  quantity: number;
  images: string[];
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

export interface PostImage {
  url: string;
}

export interface Post {
  id: number;
  author_id: number;
  status: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  images: PostImage[];
  // add other fields like title, description based on your Prisma schema
}

export interface PaginatedPosts {
  data: Post[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UploadImageResult {
  url: string;
  publicId: string;
}

// ==========================================
// POST SERVICE
// ==========================================

class PostService {
  /**
   * Fetch all posts with optional filtering and pagination
   */
  static async getAllPosts(query?: GetPostsQueryDto): Promise<PaginatedPosts> {
    const response = await api.get('/post', { params: query });
    return response.data;
  }

  /**
   * Fetch all posts created by the currently authenticated user
   */
  static async getMyPosts(): Promise<Post[]> {
    const response = await api.get('/post/myPosts');
    return response.data;
  }

  /**
   * Fetch a single post by ID
   */
  static async getPostById(id: number): Promise<Post> {
    const response = await api.get(`/post/${id}`);
    return response.data;
  }

  /**
   * Create a new post (Requires Auth)
   */
  static async createPost(data: CreatePostDto): Promise<Post> {
    const response = await api.post('/post', data);
    return response.data;
  }

  /**
   * Update an existing post (Requires Auth & Ownership)
   */
  static async updatePost(id: number, updateData: UpdatePostDto): Promise<Post> {
    const response = await api.patch(`/post/${id}`, updateData);
    return response.data;
  }

  /**
   * Delete a post (Requires Auth & Ownership/Admin)
   */
  static async deletePost(id: number): Promise<string> {
    const response = await api.delete(`/post/${id}`);
    return response.data;
  }

  /**
   * Upload an image to Cloudinary via the backend (Requires Auth)
   */
  static async uploadImage(uri: string): Promise<UploadImageResult> {
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await api.post('/cloudinary/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * Delete an uploaded image from Cloudinary (Requires Auth)
   */
  static async deleteImage(publicId: string): Promise<{ deleted: boolean }> {
    const response = await api.delete(`/cloudinary/${publicId}`);
    return response.data;
  }
}

export default PostService;