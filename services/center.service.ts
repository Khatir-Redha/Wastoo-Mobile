import api from '../lib/api';

export enum WasteCategory {
  PLASTIC = 'PLASTIC',
  GLASS = 'GLASS',
  PAPER = 'PAPER',
  METAL = 'METAL',
  ELECTRONIC = 'ELECTRONIC',
  ORGANIC = 'ORGANIC',
  OTHER = 'OTHER'
}

export interface CreateCenterDTO {
  owner_id: number;
  accepted_categories: WasteCategory[];
  opening_hours?: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface Center {
  id: number;
  owner_id: number;
  accepted_categories: WasteCategory[];
  opening_hours?: string;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
  updatedAt: string;
}

class CenterService {
  /**
   * Get center details by ID
   */
  static async getCenter(id: number): Promise<Center> {
    const response = await api.get(`/center/${id}`);
    return response.data;
  }

  /**
   * Create a new center (requires admin auth typically)
   */
  static async createCenter(data: CreateCenterDTO): Promise<Center> {
    const response = await api.post('/center', data);
    return response.data;
  }

  /**
   * Delete a center
   */
  static async deleteCenter(id: number): Promise<void> {
    const response = await api.delete(`/center/${id}`);
    return response.data;
  }
}

export default CenterService;
