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
  title: string; // Adjust based on your actual backend Prisma schema
  content: string; // Adjust based on your actual backend Prisma schema
  category?: string;
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
  // add other fields like title, content based on your Prisma schema
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

// ==========================================
// POST SERVICE
// ==========================================

class PostService {
  /**
   * Fetch all posts with optional filtering and pagination
   */
  static async getAllPosts(query?: GetPostsQueryDto): Promise<PaginatedPosts> {
    // Note: Make sure your NestJS controller uses @Query() instead of @Body()
    const response = await api.get('/post', { params: query });
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
}

export default PostService;