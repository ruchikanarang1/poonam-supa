// Task 4.1: Delivery status calculation utility

/**
 * Calculate delivery status based on booking date and expected delivery days
 * @param {string} bookingDate - ISO date string (YYYY-MM-DD)
 * @param {Date} currentDate - Current date object
 * @param {number} avgDeliveryDays - Expected delivery days
 * @returns {{days_elapsed: number, delivery_status: string}}
 */
export function calculateDeliveryStatus(bookingDate, currentDate, avgDeliveryDays) {
    if (!bookingDate || !avgDeliveryDays) {
        return { days_elapsed: 0, delivery_status: 'Unknown' };
    }

    const booking = new Date(bookingDate);
    const days_elapsed = Math.floor((currentDate - booking) / (1000 * 60 * 60 * 24));
    const tolerance = 2;

    let delivery_status;
    if (days_elapsed > (avgDeliveryDays + tolerance)) {
        delivery_status = 'Overdue';
    } else if (days_elapsed < (avgDeliveryDays - tolerance)) {
        delivery_status = 'Early';
    } else {
        delivery_status = 'On Time';
    }

    return { days_elapsed, delivery_status };
}

/**
 * Find matching booking station and get avg delivery days
 * @param {Array} bookingStations - Array of booking station objects
 * @param {string} stationName - Station name to match
 * @returns {number|null} - Average delivery days or null if not found
 */
export function getAvgDeliveryDays(bookingStations, stationName) {
    if (!bookingStations || !Array.isArray(bookingStations) || !stationName) {
        return null;
    }

    const station = bookingStations.find(
        s => s.station_name && s.station_name.toLowerCase() === stationName.toLowerCase()
    );

    return station ? station.avg_delivery_days : null;
}
