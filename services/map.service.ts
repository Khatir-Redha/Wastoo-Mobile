import api from "../lib/api";

export enum WasteCategory {
  ALL,
  PLASTIC,
  GLASS,
  PAPER,
  METAL,
  ORGANIC,
  TEXTILE,
  HAZARDOUS,
  MIXED,
}

export enum PostStatus {
  OPEN = "OPEN",
  CLAIMED = "CLAIMED",
  DELETED = "DELETED",
  COMPLETED = "COMPLETED",
}

export interface getMapPostsDTO {
  latitude: number;
  longitude: number;
  radius: number;
  category?: WasteCategory;
}

export interface MapPostsResponse {
  id: number;
  latitude: number;
  longitude: number;
  category: WasteCategory;
  title: string;
  status?: PostStatus;
}

export interface MapCenterResponse {
  id: number;
  latitude: number;
  longitude: number;
  address: string;
  name: string;
  opening_hours: string;
  accepted_categories: WasteCategory[];
  phone?: string;
}

export interface MapPickupResponse {
  id: number;
  status: string;
  collector_id: number | null;
  owner_id: number;
  post: {
    id: number;
    latitude: number | null;
    longitude: number | null;
    title: string | null;
  };
}

class MapService {
  static async getMapPosts(query: getMapPostsDTO): Promise<[MapPostsResponse]> {
    const res = await api.get("/map/posts", { params: query });
    return res.data;
  }

  static async getMapCenters(
    query: getMapPostsDTO,
  ): Promise<MapCenterResponse[]> {
    const res = await api.get("map/centers", { params: query });
    return res.data;
  }

  static async getMapPickups(
    query: getMapPostsDTO,
  ): Promise<MapPickupResponse[]> {
    const res = await api.get("map/pickups", { params: query });
    return res.data;
  }
}

export default MapService;
