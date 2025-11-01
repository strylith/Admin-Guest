/**
 * Package ID mapping utility
 * Maps booking categories to default package IDs
 * 
 * Package IDs (from database):
 * - Rooms: 1 (Standard Room)
 * - Cottages: 5 (Beachfront Cottage - first cottage)
 * - Function Halls: 8 (Grand Function Hall - first function hall)
 */

/**
 * Get the default package ID for a booking category
 * @param {string} category - Booking category ('rooms', 'cottages', 'function-halls')
 * @returns {number} Package ID, defaults to 1 (Standard Room) if category not recognized
 */
export function getPackageIdByCategory(category) {
  const categoryMap = {
    'rooms': 1,              // Standard Room
    'cottages': 5,        // Beachfront Cottage (first cottage)
    'function-halls': 8   // Grand Function Hall (first function hall)
  };
  
  const packageId = categoryMap[category] || 1;
  console.log('[PackageMapping] Category to Package ID:', { category, packageId });
  return packageId;
}



