const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });
    logger.info('✅ Firebase Admin initialized');
  } catch (error) {
    logger.error('❌ Firebase Admin init failed:', error.message);
  }
}

const sendOrderReadyNotification = async (fcmToken, tokenNumber) => {
  const message = {
    token: fcmToken,
    notification: {
      title: '🎉 Your order is ready!',
      body: `Token #${tokenNumber} — Please collect your order at the counter.`
    },
    data: { tokenNumber: String(tokenNumber), type: 'ORDER_READY' },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default', badge: 1 } } }
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`Push sent for token #${tokenNumber}: ${response}`);
    return response;
  } catch (error) {
    logger.error(`Push failed for token #${tokenNumber}: ${error.message}`);
    throw error;
  }
};

const sendTopicNotification = async (topic, title, body) => {
  const message = {
    topic,
    notification: { title, body }
  };
  return admin.messaging().send(message);
};

module.exports = { sendOrderReadyNotification, sendTopicNotification };
