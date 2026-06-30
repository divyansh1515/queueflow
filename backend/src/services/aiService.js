const logger = require('../utils/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 3000;

// Predict wait time using ML model
const predictWaitTime = async ({ queueLength, items }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const avgPrepTime = items.reduce((sum, item) => sum + item.preparationTime, 0) / items.length;

    const response = await fetch(`${AI_SERVICE_URL}/predict/wait-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_length: queueLength, total_items: totalItems, avg_prep_time: avgPrepTime }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error('AI service error');
    const data = await response.json();
    return data.estimated_wait_minutes;
  } catch (error) {
    logger.warn(`AI wait time prediction failed: ${error.message} — using fallback`);
    // Simple fallback: queue * 3 + avg prep time
    const avgPrepTime = items.reduce((sum, i) => sum + i.preparationTime, 0) / items.length;
    return Math.ceil(queueLength * 3 + avgPrepTime);
  } finally {
    clearTimeout(timeout);
  }
};

// Get rush hour predictions
const getRushHourPredictions = async () => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict/rush-hours`, { method: 'GET' });
    if (!response.ok) throw new Error('AI service error');
    return response.json();
  } catch (error) {
    logger.warn(`AI rush hour prediction failed: ${error.message}`);
    return null;
  }
};

module.exports = { predictWaitTime, getRushHourPredictions };
