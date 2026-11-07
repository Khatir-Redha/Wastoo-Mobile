import api from '../lib/api';

export enum RequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface CreateRequestDto {
  post_id: number;
  requested_quantity: number;
  message?: string;
}

export interface Request {
  id: number;
  post_id: number;
  collector_id: number;
  requested_quantity: number;
  message?: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  post?: {
    id: number;
    title: string;
    category: string;
    quantity?: number;
    available_quantity?: number;
    images: Array<{ url: string }>;
    author_id: number;
  };
  collector?: {
    id: number;
    name: string;
    phone: string;
    email: string;
  };
  pickup?: {
    id: number;
    status: string;
  };
}

export interface GetMyRequestsResponse {
  data: Request[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class RequestService {
  static async createRequest(data: CreateRequestDto): Promise<Request> {
    const response = await api.post('/request', data);
    return response.data;
  }

  static async getMyRequests(params?: { page?: number; limit?: number; status?: RequestStatus }): Promise<GetMyRequestsResponse> {
    const response = await api.get('/request/my-requests', { params });
    return response.data;
  }

  static async getRequestsForPost(postId: number): Promise<Request[]> {
    const response = await api.get(`/request/post/${postId}`);
    return response.data;
  }

  static async getRequestById(id: number): Promise<Request> {
    const response = await api.get(`/request/${id}`);
    return response.data;
  }

  static async updateRequestStatus(id: number, status: RequestStatus): Promise<Request> {
    const response = await api.patch(`/request/${id}/status`, { status });
    return response.data;
  }

  static async withdrawRequest(id: number): Promise<Request> {
    return this.updateRequestStatus(id, RequestStatus.WITHDRAWN);
  }
}

export default RequestService;