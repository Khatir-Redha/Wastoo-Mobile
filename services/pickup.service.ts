import api from '../lib/api';

export enum PickupStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  REQUESTED = 'REQUESTED',
  COLLECTED_PENDING_VERIFICATION = 'COLLECTED_PENDING_VERIFICATION'
}

export interface CreatePickupDto {
  post_id: number;
  owner_id: number;
  collector_id?: number;
  status: PickupStatus;
  contact_number?: string;
  access_notes?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  cancel_reason?: string;
  cancel_notes?: string;
  collected_weight?: number;
}

export interface UpdatePickupDto extends Partial<CreatePickupDto> {}

export interface Pickup {
  id: number;
  post_id: number;
  owner_id: number;
  collector_id?: number;
  status: PickupStatus;
  contact_number?: string;
  access_notes?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  cancel_reason?: string;
  cancel_notes?: string;
  collected_weight?: number;
  deleted_at?: string | null;
  createdAt: string;
  updatedAt: string;
  post?: {
    id: number;
    title: string;
    description?: string;
    category?: string;
    quantity?: number;
    address?: string;
    images: Array<{ url: string }>;
  };
  request?: {
    id: number;
    requested_quantity: number;
    status: string;
  };
}

class PickupService {
  /**
   * Fetch all pickups available
   */
  static async getAllPickups(): Promise<Pickup[]> {
    const response = await api.get('/pickup');
    return response.data;
  }

  /**
   * Fetch pickups for the current user
   */
  static async getMyPickups(): Promise<Pickup[]> {
    const response = await api.get('/pickup/myPickups');
    return response.data;
  }

  /**
   * Create a pickup from an accepted request (internal use)
   */
  static async createPickupFromRequest(requestId: number): Promise<Pickup> {
    const response = await api.post(`/pickup/from-request/${requestId}`);
    return response.data;
  }

  /**
   * Create a new pickup (legacy - kept for backwards compatibility)
   * Backend: POST /pickup
   */
  static async createPickup(data: CreatePickupDto): Promise<Pickup> {
    const response = await api.post('/pickup', data);
    return response.data;
  }

  /**
   * Update an existing pickup
   */
  static async updatePickup(id: number, data: UpdatePickupDto): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}`, data);
    return response.data;
  }

  /**
   * Assign collector to pickup
   * Backend: PATCH /pickup/:id/assign
   */
  static async assignCollector(id: number): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}/assign`);
    return response.data;
  }

  /**
   * Start pickup transit (collector starts pickup)
   * Backend: PATCH /pickup/:id/start-transit
   */
  static async startTransit(id: number): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}/start-transit`);
    return response.data;
  }

  /**
   * Report collected quantity (collector)
   * Backend: PATCH /pickup/:id/report-collection
   * Transitions: IN_TRANSIT -> COLLECTED_PENDING_VERIFICATION
   */
  static async reportCollection(id: number, collected_weight: number): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}/report-collection`, { collected_weight });
    return response.data;
  }

  /**
   * Verify or reject collection (supplier only)
   * Backend: PATCH /pickup/:id/verify
   * Transitions: COLLECTED_PENDING_VERIFICATION -> COMPLETED (verified=true)
   *            or COLLECTED_PENDING_VERIFICATION -> IN_TRANSIT (verified=false)
   */
  static async verifyCollection(id: number, verified: boolean, collected_weight?: number): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}/verify`, { verified, collected_weight });
    return response.data;
  }

  /**
   * Cancel pickup (collector or supplier)
   * Backend: PATCH /pickup/:id/cancel
   */
  static async cancelPickup(id: number): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}/cancel`);
    return response.data;
  }

  /**
   * Get pickup by ID
   */
  static async getPickupById(id: number): Promise<Pickup> {
    const response = await api.get(`/pickup/${id}`);
    return response.data;
  }
}

export default PickupService;