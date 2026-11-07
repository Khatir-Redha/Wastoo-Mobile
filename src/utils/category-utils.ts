/**
 * Shared waste-category helpers.
 *
 * The WasteCategory enum is a numeric enum (0..8), so when it arrives as a
 * string from the API we need to normalize it before any switch can match.
 * These helpers centralize that normalization so every consumer renders the
 * same icon / color / label for a given category.
 */
import { WasteCategory } from '../../services/map.service';
import { theme } from '../theme/tokens';

/**
 * Normalizes a category value into a WasteCategory enum member.
 * Handles numeric enums, string enums, and plain strings (e.g. "plastic").
 */
export function normalizeCategory(value: unknown): WasteCategory {
  if (value === null || value === undefined) return WasteCategory.MIXED;

  // Already a numeric enum member
  if (typeof value === 'number' && value in WasteCategory) return value as WasteCategory;

  const str = String(value).trim().toUpperCase();
  if (!str) return WasteCategory.MIXED;

  // Match against enum member names (PLASTIC, GLASS, ...)
  const matched = (Object.values(WasteCategory) as unknown[]).find(
    member => String(member).toUpperCase() === str,
  );
  if (matched !== undefined) return matched as WasteCategory;

  return WasteCategory.MIXED;
}

export function getCategoryName(category: WasteCategory | string | null | undefined): string {
  const normalized = typeof category === 'string' ? normalizeCategory(category) : (category ?? WasteCategory.MIXED);
  switch (normalized) {
    case WasteCategory.ALL: return 'All';
    case WasteCategory.PLASTIC: return 'Plastic';
    case WasteCategory.GLASS: return 'Glass';
    case WasteCategory.PAPER: return 'Paper';
    case WasteCategory.METAL: return 'Metal';
    case WasteCategory.ORGANIC: return 'Organic';
    case WasteCategory.TEXTILE: return 'Textile';
    case WasteCategory.HAZARDOUS: return 'Hazardous';
    case WasteCategory.MIXED: return 'Mixed';
    default: return 'Unknown';
  }
}

export function getCategoryColor(category: WasteCategory | string | null | undefined): string {
  const normalized = typeof category === 'string' ? normalizeCategory(category) : (category ?? WasteCategory.MIXED);
  switch (normalized) {
    case WasteCategory.PLASTIC: return theme.colors.category.plastic;
    case WasteCategory.GLASS: return theme.colors.category.glass;
    case WasteCategory.PAPER: return theme.colors.category.paper;
    case WasteCategory.METAL: return theme.colors.category.metal;
    case WasteCategory.ORGANIC: return theme.colors.category.organic;
    case WasteCategory.TEXTILE: return theme.colors.category.general;
    case WasteCategory.HAZARDOUS: return theme.colors.error[500];
    case WasteCategory.MIXED: return theme.colors.category.general;
    default: return theme.colors.emerald[500];
  }
}

export function getCategoryIcon(category: WasteCategory | string | null | undefined): string {
  const normalized = typeof category === 'string' ? normalizeCategory(category) : (category ?? WasteCategory.MIXED);
  switch (normalized) {
    case WasteCategory.PLASTIC: return 'recycle';
    case WasteCategory.GLASS: return 'bottle-wine';
    case WasteCategory.PAPER: return 'newspaper-variant';
    case WasteCategory.METAL: return 'cube';
    case WasteCategory.ORGANIC: return 'leaf';
    case WasteCategory.TEXTILE: return 'tshirt-crew';
    case WasteCategory.HAZARDOUS: return 'alert-octagon';
    case WasteCategory.MIXED: return 'package-variant-closed';
    default: return 'recycle';
  }
}