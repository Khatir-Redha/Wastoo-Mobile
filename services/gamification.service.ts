import api from "../lib/api";

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon_url: string;
  criteria: { metric: "posts" | "pickups"; threshold: number };
}

export interface UserBadge {
  id: number;
  user_id: number;
  badge_code: string;
  awarded_at: string;
}

export interface GetBadgesResponse {
  count: number;
  badges: Badge[];
  userBadges: UserBadge[];
}

class GamificationService {
  static async getBadges(): Promise<GetBadgesResponse> {
    const res = await api.get("/gamification/badges");
    return res.data;
  }
}

export default GamificationService;
