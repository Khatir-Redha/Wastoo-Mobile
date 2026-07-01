import api from '../lib/api'

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


export interface getMapPostsDTO {
    latitude: number,
    longitude: number,
    radius: number,
    category? : WasteCategory
}

export interface MapPostsResponse {
    id: number,
    latitude: number,
    longitude: number,
    category: WasteCategory,
    title: string,
}

class MapService {
    
    static async getMapPosts(query: getMapPostsDTO): Promise<[MapPostsResponse]>{
        
        const res = await api.get('/map/posts', {params: query})
        console.log(res.data);
        return res.data
        
    }
}

export default MapService;