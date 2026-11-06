export interface AuthenticatedUser {
  id: number;
  name?: string;
  email?: string;
  phone: string | null;
  onboardingCompleted: boolean;
  status?: string;
  role: string | null;
  photo?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

type ProfileRecord = Record<string, unknown>;

const isProfileRecord = (value: unknown): value is ProfileRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getProfileRecord = (response: unknown): ProfileRecord | null => {
  let value = response;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!isProfileRecord(value)) return null;
    if ("id" in value || "_id" in value) return value;
    if (isProfileRecord(value.user)) {
      value = value.user;
    } else if (isProfileRecord(value.data)) {
      value = value.data;
    } else {
      return null;
    }
  }
  return isProfileRecord(value) ? value : null;
};

export const parseAuthenticatedUser = (
  response: unknown,
  status: number,
): AuthenticatedUser => {
  const profile = getProfileRecord(response);
  if (!profile) {
    const keys = isProfileRecord(response) ? Object.keys(response) : [];
    throw new Error(
      `Authenticated profile contract mismatch (HTTP ${status}): expected a profile object with id; received keys [${keys.join(", ")}].`,
    );
  }

  const rawId = profile.id ?? profile._id;
  const id =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string" && /^\d+$/.test(rawId)
        ? Number(rawId)
        : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(
      `Authenticated profile contract mismatch (HTTP ${status}): invalid id type "${typeof rawId}".`,
    );
  }

  if (
    profile.role !== undefined &&
    profile.role !== null &&
    (typeof profile.role !== "string" || profile.role.length === 0)
  ) {
    throw new Error(
      `Authenticated profile contract mismatch (HTTP ${status}): invalid role type "${typeof profile.role}".`,
    );
  }
  if (typeof profile.onboardingCompleted !== "boolean") {
    throw new Error(
      `Authenticated profile contract mismatch (HTTP ${status}): onboardingCompleted must be a boolean.`,
    );
  }
  if (profile.onboardingCompleted && typeof profile.role !== "string") {
    throw new Error(
      `Authenticated profile contract mismatch (HTTP ${status}): a completed profile must include a role.`,
    );
  }

  return {
    id,
    name: typeof profile.name === "string" ? profile.name : undefined,
    email: typeof profile.email === "string" ? profile.email : undefined,
    phone: typeof profile.phone === "string" ? profile.phone : null,
    onboardingCompleted: profile.onboardingCompleted,
    status: typeof profile.status === "string" ? profile.status : undefined,
    role: typeof profile.role === "string" ? profile.role : null,
    photo: typeof profile.photo === "string" ? profile.photo : null,
    createdAt:
      typeof profile.createdAt === "string" ? profile.createdAt : undefined,
    updatedAt:
      typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
    deletedAt:
      typeof profile.deletedAt === "string" ? profile.deletedAt : null,
  };
};

export type AuthState =
  | "INITIALIZING"
  | "UNAUTHENTICATED"
  | "AUTHENTICATED_COMPLETE"
  | "AUTHENTICATED_INCOMPLETE"
  | "RESTORATION_ERROR";

export const authStateForProfile = (
  user: Pick<AuthenticatedUser, "onboardingCompleted">,
): AuthState =>
  user.onboardingCompleted
    ? "AUTHENTICATED_COMPLETE"
    : "AUTHENTICATED_INCOMPLETE";

export const getAuthRoute = (
  authState: AuthState,
  role: string | null | undefined,
): string | null => {
  if (authState === "UNAUTHENTICATED") return "/auth";
  if (authState === "AUTHENTICATED_INCOMPLETE") return "/onboarding";
  if (authState !== "AUTHENTICATED_COMPLETE" || !role) return null;

  // Special handling for collector role to land on map screen
  const normalizedRole = role.toLowerCase().replace(/\s+/g, "-");
  if (normalizedRole === "collector") {
    return "/collector/map";
  }

  return `/${normalizedRole}`;
};
