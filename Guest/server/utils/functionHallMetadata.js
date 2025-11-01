// Shared utility for building function hall metadata
// Used by both real database (bookings.js) and mock database (mockBookings.js)

/**
 * Build function hall metadata object from field values
 * @param {Object} fhFields - Object containing function hall field values
 * @returns {Object|null} - Metadata object or null if insufficient data
 */
export function buildFunctionHallMetadata(fhFields) {
  const {
    hallId,
    hallName,
    eventName,
    eventType,
    setupType,
    decorationTheme,
    organization,
    startTime,
    endTime,
    soundSystemRequired,
    projectorRequired,
    cateringRequired,
    equipmentAddons
  } = fhFields;
  
  // Return null if no hallId or no meaningful event data
  if (!hallId || (!eventName && !eventType && !setupType && !startTime && !endTime)) {
    return null;
  }
  
  return {
    hallId: hallId,
    hallName: hallName || hallId,
    eventName: eventName || null,
    eventType: eventType || null,
    setupType: setupType || null,
    decorationTheme: decorationTheme || null,
    organization: organization || null,
    startTime: startTime || null,
    endTime: endTime || null,
    soundSystemRequired: soundSystemRequired || false,
    projectorRequired: projectorRequired || false,
    cateringRequired: cateringRequired || false,
    equipmentAddons: Array.isArray(equipmentAddons) ? equipmentAddons : []
  };
}

