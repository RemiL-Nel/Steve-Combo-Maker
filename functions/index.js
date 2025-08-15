const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Enable CORS for all functions
exports.corsEnabledFunction = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    // For non-preflight requests, proceed with your function logic
    try {
      // Your function logic here
      res.set('Access-Control-Allow-Origin', '*');
      res.json({ message: 'CORS-enabled function executed successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'An error occurred' });
    }
  });
});

// Example function to get a download URL for a file
exports.getDownloadUrl = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const filePath = req.query.path;
      if (!filePath) {
        res.status(400).json({ error: 'File path is required' });
        return;
      }

      const bucket = admin.storage().bucket('steve-combo-generator.appspot.com');
      const file = bucket.file(filePath);
      
      // Get a signed URL for the file
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // Far future expiration
      });

      res.set('Access-Control-Allow-Origin', '*');
      res.json({ url });
    } catch (error) {
      console.error('Error getting download URL:', error);
      res.status(500).json({ error: 'Failed to get download URL' });
    }
  });
});
