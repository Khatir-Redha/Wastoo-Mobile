/**
 * Utility for calculating post quantities across different data formats.
 * Handles both camelCase and snake_case field names from different API endpoints.
 * Derives calculated fields when source data is incomplete.
 */
export interface PostQuantities {
  total: number | null;
  available: number | null;
  reserved: number | null;
  collected: number | null;
  unit: 'kg' | 'L';
}

// WasteCategory enum value
type WasteCategoryValue = number;

type PostData = {
  // Standard camelCase fields
  quantity?: number | null;
  available_quantity?: number | null;
  total_quantity?: number | null;
  reserved_quantity?: number | null;
  collected_quantity?: number | null;
  weight?: number | null;
  status?: string;
  category?: string | WasteCategoryValue;
  unit?: 'kg' | 'L';
  // Snake_case aliases (for legacy/different endpoints)
  total?: number | null;
};

/**
 * Extracts and normalizes post quantities from various API response formats.
 * Derives available quantity from total - reserved - collected when not directly provided.
 * @param post The post object from any endpoint
 * @returns Normalized quantities with null for missing data, calculated values where possible
 */
export function getPostQuantities(post: PostData | null | undefined): PostQuantities {
  if (!post) {
    return { total: null, available: null, reserved: null, collected: null, unit: 'kg' };
  }

  // Determine unit based on category or explicit unit field
  const liquidCategories = ['ORGANIC', 'HAZARDOUS'];
  const categoryValue = post.category;
  const categoryStr = typeof categoryValue === 'string' ? categoryValue.toUpperCase() : '';
  const explicitUnit = post.unit;

  // WasteCategory enum: ORGANIC = 6, HAZARDOUS = 8
  const isLiquidCategory = categoryStr === 'ORGANIC' || categoryStr === 'HAZARDOUS' ||
    categoryValue === 6 || categoryValue === 8;
  const unit: 'kg' | 'L' = explicitUnit ?? (isLiquidCategory ? 'L' : 'kg');

  // Get total from various possible field names
  const total =
    typeof post.quantity === 'number' && post.quantity !== null ? post.quantity :
    typeof post.total_quantity === 'number' && post.total_quantity !== null ? post.total_quantity :
    typeof post.total === 'number' && post.total !== null ? post.total :
    typeof post.weight === 'number' && post.weight !== null ? post.weight :
    null;

  // Get reserved from various possible field names, default to 0
  const reserved =
    typeof post.reserved_quantity === 'number' && post.reserved_quantity !== null ? post.reserved_quantity : 0;

  // Get collected from various possible field names, default to 0
  const collected =
    typeof post.collected_quantity === 'number' && post.collected_quantity !== null ? post.collected_quantity : 0;

  // Get available - either explicitly provided or derived from total - reserved - collected
  const explicitAvailable = typeof post.available_quantity === 'number' && post.available_quantity !== null ? post.available_quantity : null;
  const available =
    explicitAvailable ??
    (total !== null ? Math.max(0, total - reserved - collected) : null);

  // Return nulls only when total itself is missing or not a number
  return { total, available, reserved, collected, unit };
}