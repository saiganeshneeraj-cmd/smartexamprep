const express = require('express');
const router = express.Router();

// In-memory store for subscriptions (session only)
const subscriptions = new Map();

// POST /api/notify/subscribe - Save push subscription
router.post('/subscribe', (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription) return res.status(400).json({ error: 'No subscription provided' });
  const id = userId || 'guest_' + Date.now();
  subscriptions.set(id, subscription);
  console.log(`✅ Push subscription saved for: ${id}`);
  return res.json({ success: true, id });
});

// POST /api/notify/send - Send push notification
router.post('/send', async (req, res) => {
  const { title, body, userId } = req.body;
  const payload = JSON.stringify({ title: title || 'NeuralPrep', body: body || 'Time to study!' });

  // If web-push is available, use it; otherwise just confirm
  try {
    const webpush = require('web-push');
    const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      webpush.setVapidDetails('mailto:neuralprep@study.com', VAPID_PUBLIC, VAPID_PRIVATE);
      const sub = userId ? subscriptions.get(userId) : Array.from(subscriptions.values())[0];
      if (sub) {
        await webpush.sendNotification(sub, payload);
        return res.json({ success: true, sent: true });
      }
    }
  } catch (e) {}

  return res.json({ success: true, sent: false, message: 'Use browser notification API directly' });
});

// GET /api/notify/vapid - Get public VAPID key
router.get('/vapid', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || '';
  res.json({ key });
});

module.exports = router;
