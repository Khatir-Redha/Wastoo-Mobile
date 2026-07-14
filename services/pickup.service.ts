import api from '../lib/api';

export enum PickupStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
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
  createdAt: string;
  updatedAt: string;
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
   * Create a new pickup request.
   * Only sends the fields the backend currently accepts.
   * Extra UI fields (contact_number, access_notes, etc.) are kept locally only.
   */
  static async createPickup(data: CreatePickupDto): Promise<Pickup> {
    // The backend schema only accepts these 4 fields right now.
    // Strip any extra UI-only fields to avoid a 500 error.
    const payload = {
      post_id: data.post_id,
      owner_id: data.owner_id,
      status: data.status,
      ...(data.collector_id !== undefined ? { collector_id: data.collector_id } : {}),
    };
    const response = await api.post('/pickup', payload);
    return response.data;
  }

  /**
   * Update an existing pickup request
   */
  static async updatePickup(id: number, data: UpdatePickupDto): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}`, data);
    return response.data;
  }

  /**
   * Assign collector to a pickup (Accept Pickup)
   */
  static async assignCollector(id: number): Promise<Pickup> {
    const response = await api.patch(`/pickup/accept/${id}`);
    return response.data;
  }

  /**
   * Update pickup status to in transit
   */
  static async updateStatus(id: number): Promise<Pickup> {
    const response = await api.patch(`/pickup/${id}/updateStatus`);
    return response.data;
  }

  /**
   * Delete or cancel a pickup
   */
  static async deletePickup(id: number): Promise<void> {
    const response = await api.delete(`/pickup/${id}`);
    return response.data;
  }
}

export default PickupService;
