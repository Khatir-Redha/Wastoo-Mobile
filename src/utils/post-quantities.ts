/**
 * Utility for calculating post quantities across different data formats.
 * Handles both camelCase and snake_case field names from different API endpoints.
 */
export interface PostQuantities {
  total: number | null;
  available: number | null;
  reserved: number | null;
  collected: number | null;
  unit: 'kg' | 'L';
}

type PostData = {
  // Standard camelCase fields
  quantity?: number | null;
  available_quantity?: number | null;
  reserved_quantity?: number | null;
  collected_quantity?: number | null;
  weight?: number | null;
  status?: string;
  category?: string;

  // Snake_case aliases (for legacy/different endpoints)
  total_quantity?: number | null;
};

/**
 * Extracts and normalizes post quantities from various API response formats.
 * @param post The post object from any endpoint
 * @returns Normalized quantities with null for missing data
 */
export function getPostQuantities(post: PostData | null | undefined): PostQuantities {
  if (!post) {
    return { total: null, available: null, reserved: null, collected: null, unit: 'kg' };
  }

  // Determine unit based on category
  const liquidCategories = ['ORGANIC', 'HAZARDOUS'];
  const category = typeof post.category === 'string' ? post.category.toUpperCase() : '';
  const unit: 'kg' | 'L' = liquidCategories.includes(category) ? 'L' : 'kg';

  // Get quantities from various possible field names (camelCase first, then snake_case, then legacy weight)
  const total =
    typeof post.quantity === 'number' ? post.quantity :
    typeof post.total_quantity === 'number' ? post.total_quantity :
    typeof post.weight === 'number' ? post.weight :
    null;

  const available =
    typeof post.available_quantity === 'number' ? post.available_quantity :
    null;  // Never default to 0 - missing data should be null

  const reserved =
    typeof post.reserved_quantity === 'number' ? post.reserved_quantity :
    null;

  const collected =
    typeof post.collected_quantity === 'number' ? post.collected_quantity :
    null;

  return { total, available, reserved, collected, unit };
}