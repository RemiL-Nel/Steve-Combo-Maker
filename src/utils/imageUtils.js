import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

// Configure storage
const storage = getStorage();
storage.maxOperationRetryTime = 10000; // 10 seconds

// Cloud Function to get download URL
const getDownloadUrl = httpsCallable(functions, 'getDownloadUrl');

// Helper function to convert a canvas to a blob with better error handling
const canvasToBlob = (canvas) => {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }
          resolve(blob);
        },
        'image/png',
        0.8 // 80% quality for smaller file size
      );
    } catch (error) {
      console.error('Error in canvasToBlob:', error);
      reject(error);
    }
  });
};

export const captureAndUploadPreview = async (element, comboId) => {
  try {
    // Import html2canvas dynamically to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    
    console.log('Starting html2canvas capture...');
    
    // Capture the element as a canvas with CORS support
    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      logging: true, // Enable logging to help with debugging
      allowTaint: true, // Allow cross-origin images to taint the canvas
      backgroundColor: null,
      onclone: (clonedDoc) => {
        // Ensure all images have CORS attributes
        const images = clonedDoc.images;
        for (let img of images) {
          if (!img.crossOrigin) {
            img.crossOrigin = 'anonymous';
          }
        }
      }
    });
    
    console.log('Canvas captured, converting to blob...');
    
    // Convert canvas to blob with better error handling
    const blob = await canvasToBlob(canvas);
    
    console.log('Uploading to Firebase Storage...');
    
    // Get storage reference with the correct path
    const filePath = `previews/${comboId}.png`;
    const storageRef = ref(storage, filePath);
    
    try {
      // Upload with metadata and CORS headers
      await uploadBytes(storageRef, blob, {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
        customMetadata: {
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
        }
      });
    
      // Get the download URL using the Cloud Function
      const { data } = await getDownloadUrl({ path: filePath });
      const downloadURL = `${data.url}?t=${new Date().getTime()}`;
      
      // Update the combo document with the preview URL
      const comboRef = doc(db, 'combos', comboId);
      await updateDoc(comboRef, {
        previewUpdatedAt: new Date().toISOString()
      });
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image to Firebase Storage:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  } catch (error) {
    console.error('Error capturing/uploading preview:', error);
    throw error;
  }
};
