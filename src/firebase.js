// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDoc,
  getDocs, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc
} from "firebase/firestore";
import { increment } from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// Using environment variables for security
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Function to publish a combo (mark as public)
export const publishCombo = async (comboId, userId) => {
  if (!comboId || !userId) {
    throw new Error('Combo ID and User ID are required');
  }

  try {
    const comboRef = doc(db, 'combos', comboId);
    const comboDoc = await getDoc(comboRef);

    if (!comboDoc.exists()) {
      throw new Error('Combo not found');
    }

    const comboData = comboDoc.data();
    if (comboData.userId !== userId) {
      throw new Error('You do not have permission to publish this combo');
    }

    // Update the combo to be published, preserving all existing data
    await setDoc(comboRef, { 
      ...comboData, // Include all existing combo data
      isPublished: true, 
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error publishing combo:', error);
    throw error;
  }
};

// Toggle like for a combo by a user. Returns the new liked state { liked: boolean, likesCount: number }
export const toggleLike = async (comboId, userId) => {
  if (!comboId || !userId) throw new Error('comboId and userId are required');

  const comboRef = doc(db, 'combos', comboId);
  const likeRef = doc(db, 'combos', comboId, 'likes', userId);

  const likeSnap = await getDoc(likeRef);
  if (likeSnap.exists()) {
    // Unlike
    await deleteDoc(likeRef);
    await setDoc(comboRef, { likesCount: increment(-1), updatedAt: serverTimestamp() }, { merge: true });
    const comboSnap = await getDoc(comboRef);
    return { liked: false, likesCount: (comboSnap.data()?.likesCount) || 0 };
  } else {
    // Like
    await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
    await setDoc(comboRef, { likesCount: increment(1), updatedAt: serverTimestamp() }, { merge: true });
    const comboSnap = await getDoc(comboRef);
    return { liked: true, likesCount: (comboSnap.data()?.likesCount) || 0 };
  }
};

// Check if a user has liked a combo
export const hasUserLiked = async (comboId, userId) => {
  if (!comboId || !userId) return false;
  const likeRef = doc(db, 'combos', comboId, 'likes', userId);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signUpWithEmail = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const logout = () => {
  return signOut(auth);
};

export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

// Update current user's display name
export const updateUserDisplayName = async (displayName) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  if (!displayName || !displayName.trim()) throw new Error('Display name cannot be empty');
  await updateProfile(user, { displayName: displayName.trim() });
  return auth.currentUser;
};

// Function to send password reset email
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Function to save a combo to Firestore
export const saveCombo = async (comboData) => {
  try {
    console.log('💾 Starting to save combo:', { ...comboData, image: comboData.image ? '[BASE64_IMAGE]' : null });
    
    const user = auth.currentUser;
    if (!user) {
      const errorMsg = 'User must be logged in to save combos';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('👤 Current user:', {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email
    });

    // Extract and validate the combo data we want to save
    const { 
      percentage = 0, 
      gold = false, 
      startingMove = 'Jab', 
      positions = {},
      di = 'No DI',
      sdi = 'No SDI',
      sdiStrength = '0',
      image = null,  // Expecting base64 string
      solution = ''  // Combo solution/description
    } = comboData;
    const name = comboData.name?.trim() || 'Unnamed Combo';
    const description = comboData.description?.trim() || '';
    const difficulty = typeof comboData.difficulty === 'number' ? comboData.difficulty : 5;
    const isPublished = comboData.isPublished === true;
    const publishedAt = comboData.publishedAt || (isPublished ? new Date() : null);

    console.log('📝 Prepared combo data:', {
      name,
      description,
      percentage,
      gold,
      startingMove,
      difficulty,
      isPublished,
      publishedAt,
      hasPositions: !!positions,
      di,
      sdi,
      sdiStrength
    });
    
    console.log('📅 Current timestamp:', new Date());

    // Reference to the combos collection
    const combosRef = collection(db, 'combos');
    console.log('📂 Collection reference:', combosRef);
    
    // Prepare the document data
    const comboDoc = {
      // Store the base64 image if provided
      ...(image && { image }),
      // Basic combo info
      name,
      description,
      
      // Combo data
      percentage,
      gold,
      startingMove,
      di,
      sdi,
      sdiStrength,
      positions,
      solution,
      difficulty,
      
      // User info
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userPhoto: user.photoURL || null,
      
      // Metadata
      isPublished,
      publishedAt: isPublished ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Aggregates
      likesCount: 0,
      
      // Add tags for easier querying
      tags: [
        `percent-${Math.floor(percentage/10)*10}`, // e.g., 'percent-0', 'percent-10', etc.
        gold ? 'gold' : 'no-gold',
        `move-${String(startingMove).toLowerCase().replace(/\s+/g, '-')}` // e.g., 'move-jab', 'move-up-tilt'
      ]
    };

    console.log('📤 Saving to Firestore:', comboDoc);
    
    // Add the document to the collection
    const docRef = await addDoc(combosRef, comboDoc);
    
    console.log('✅ Combo saved successfully with ID:', docRef.id);
    console.log('📂 Full document path:', `combos/${docRef.id}`);
    
    // Verify the document was saved
    const savedDoc = await getDoc(docRef);
    if (savedDoc.exists()) {
      console.log('🔍 Document verification:', {
        id: savedDoc.id,
        data: savedDoc.data()
      });
    } else {
      console.warn('⚠️ Saved document could not be verified');
    }
    
    return docRef.id;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw e;
  }
};

// Function to get all combos
export const getAllCombos = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'combos'));
    const combos = [];
    querySnapshot.forEach((doc) => {
      combos.push({ id: doc.id, ...doc.data() });
    });
    return combos;
  } catch (e) {
    console.error('Error getting documents: ', e);
    throw e;
  }
};

// Function to get combos by user ID
export const getUserCombos = async (userId) => {
  if (!userId) {
    console.error('❌ No user ID provided to getUserCombos');
    return [];
  }

  try {
    console.log('🔍 Fetching combos for user:', userId);
    
    // First, check if the collection exists and is accessible
    const combosRef = collection(db, 'combos');
    console.log('📂 Collection reference:', combosRef);
    
    // Create the query
    const q = query(
      combosRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    console.log('🔎 Executing query:', q);
    
    // Execute the query
    const querySnapshot = await getDocs(q);
    console.log(`✅ Found ${querySnapshot.size} combos for user ${userId}`);
    
    // Log each document found
    if (querySnapshot.size === 0) {
      console.log('ℹ️ No combos found for user. Checking if collection is accessible...');
      
      // Try to get any document to check collection access
      const testQuery = query(combosRef, limit(1));
      const testSnapshot = await getDocs(testQuery);
      console.log(`ℹ️ Test query found ${testSnapshot.size} documents in collection`);
      
      if (testSnapshot.size > 0) {
        console.log('ℹ️ Collection is accessible but no combos found for this user');
      } else {
        console.log('ℹ️ No documents found in collection. Collection may not exist or may be empty.');
      }
    }
    
    const combos = [];
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        console.log(`📄 Combo ${doc.id}:`, {
          id: doc.id,
          name: data.name,
          userId: data.userId,
          createdAt: data.createdAt?.toDate?.() || 'No date',
          hasPositions: !!data.positions,
          hasStartingMove: !!data.startingMove,
          rawData: data
        });
        
        // Ensure all required fields have values
        const combo = { 
          id: doc.id, 
          ...data,
          name: data.name || 'Unnamed Combo',
          description: data.description || '',
          difficulty: typeof data.difficulty === 'number' ? data.difficulty : 5,
          percentage: typeof data.percentage === 'number' ? data.percentage : 0,
          gold: !!data.gold,
          startingMove: data.startingMove || 'Jab',
          positions: data.positions || { steveX: 30, lucinaX: 70, bottomOffset: 0 },
          formattedCreatedAt: data.createdAt?.toDate ? formatDate(data.createdAt.toDate()) : 'Unknown',
          formattedUpdatedAt: data.updatedAt?.toDate ? formatDate(data.updatedAt.toDate()) : 'Unknown'
        };
        
        console.log(`✅ Processed combo ${doc.id}:`, combo);
        combos.push(combo);
      } catch (docError) {
        console.error(`❌ Error processing document ${doc.id}:`, docError);
      }
    });
    
    console.log(`📊 Returning ${combos.length} combos`);
    return combos;
  } catch (e) {
    console.error('Error getting user combos: ', e);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Function to delete a combo
export const deleteCombo = async (comboId, userId) => {
  if (!comboId || !userId) {
    throw new Error('Combo ID and User ID are required');
  }

  try {
    // First verify the combo belongs to the user
    const comboRef = doc(db, 'combos', comboId);
    const comboDoc = await getDoc(comboRef);
    
    if (!comboDoc.exists()) {
      throw new Error('Combo not found');
    }
    
    const comboData = comboDoc.data();
    if (comboData.userId !== userId) {
      throw new Error('You do not have permission to delete this combo');
    }
    
    // Delete the combo
    await deleteDoc(comboRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting combo:', error);
    throw error;
  }
};

// Function to add a comment to a combo
export const addComment = async (comboId, commentData) => {
  if (!comboId || !commentData.userId || !commentData.text) {
    throw new Error('Combo ID, user ID, and comment text are required');
  }

  try {
    const commentsRef = collection(db, 'combos', comboId, 'comments');
    const newComment = {
      ...commentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(commentsRef, newComment);
    return { id: docRef.id, ...newComment };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Function to get comments for a combo
export const getComments = async (comboId) => {
  if (!comboId) return [];

  try {
    const commentsRef = collection(db, 'combos', comboId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamp to Date
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

// Function to submit a rating for a combo
export const submitRating = async (comboId, userId, rating) => {
  if (!comboId || !userId || rating < 1 || rating > 10) {
    throw new Error('Invalid rating data');
  }

  try {
    // Get the current user's existing rating if it exists
    const ratingRef = doc(db, 'combos', comboId, 'ratings', userId);
    const ratingDoc = await getDoc(ratingRef);
    const isUpdate = ratingDoc.exists();
    
    // Store the rating
    await setDoc(ratingRef, {
      userId,
      rating,
      timestamp: serverTimestamp()
    });
    
    // Update the combo's average rating
    const result = await updateComboAverageRating(comboId);
    
    return { 
      success: true, 
      isUpdate,
      ...result
    };
  } catch (error) {
    console.error('Error submitting rating:', error);
    throw error;
  }
};

// Helper function to update a combo's average rating
const updateComboAverageRating = async (comboId) => {
  try {
    const ratingsRef = collection(db, 'combos', comboId, 'ratings');
    const q = query(ratingsRef);
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return;
    
    let total = 0;
    let count = 0;
    
    querySnapshot.forEach((doc) => {
      total += doc.data().rating;
      count++;
    });
    
    const average = total / count;
    
    // Update the combo document with the new average rating
    const comboRef = doc(db, 'combos', comboId);
    await updateDoc(comboRef, {
      averageRating: Math.round(average * 10) / 10, // Round to 1 decimal place
      ratingCount: count
    });
    
    return { averageRating: average, ratingCount: count };
  } catch (error) {
    console.error('Error updating average rating:', error);
    throw error;
  }
};

// Function to get a user's rating for a combo
export const getUserRating = async (comboId, userId) => {
  if (!comboId || !userId) return null;
  
  try {
    const ratingRef = doc(db, 'combos', comboId, 'ratings', userId);
    const ratingDoc = await getDoc(ratingRef);
    
    if (ratingDoc.exists()) {
      return ratingDoc.data().rating;
    }
    return null;
  } catch (error) {
    console.error('Error getting user rating:', error);
    return null;
  }
};

// Function to generate a shareable link for a combo
export const shareCombo = (comboId) => {
  // In a real app, you might want to create a public view or use a URL shortener
  const baseUrl = window.location.origin;
  return `${baseUrl}/combo/${comboId}`;
};

// Helper function to format dates
export const formatDate = (date) => {
  if (!date) return 'Unknown';
  
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};