/**
 * Date formatting utilities for GraphQL API compatibility
 * Handles conversion between HTML date inputs and GraphQL Time scalar requirements
 */

/**
 * Converts a date string to RFC3339 format required by GraphQL Time scalar
 * @param dateString - Date in YYYY-MM-DD format or already in RFC3339 format
 * @returns RFC3339 formatted string (YYYY-MM-DDTHH:mm:ssZ)
 */
export function formatDateForGraphQL(dateString: string): string {
  if (!dateString) return '';
  
  // If already in RFC3339 format, return as-is
  if (dateString.includes('T')) {
    return dateString;
  }
  
  // Convert YYYY-MM-DD to RFC3339 format with 00:00:00 time
  return `${dateString}T00:00:00Z`;
}

/**
 * Formats a date for display in Indonesian locale
 * @param dateString - Date string in any valid format
 * @returns Formatted date string in Indonesian locale
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return dateString;
  }
}

/**
 * Gets current date in YYYY-MM-DD format for HTML date inputs
 * @returns Today's date in YYYY-MM-DD format
 */
export function getCurrentDateForInput(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Validates if a date string is in valid format for harvest input
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidHarvestDate(dateString: string): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  
  // Must be a valid date and not in the future
  return !isNaN(date.getTime()) && date <= today;
}