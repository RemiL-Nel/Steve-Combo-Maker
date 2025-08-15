import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const USERS_COLLECTION = 'users';

/**
 * Create or update a user document in Firestore
 * @param {string} userId - The user's unique ID (from Firebase Auth)
 * @param {Object} userData - User data to store
 * @returns {Promise<Object>} - The result of the operation
 */
export const createOrUpdateUser = async (userId, userData) => {
  try {
    if (!userId) throw new Error('User ID is required');
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    const userInfo = {
      ...userData,
      updatedAt: serverTimestamp(),
      ...(!userDoc.exists() && { 
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      })
    };
    
    await setDoc(userRef, userInfo, { merge: true });
    return { success: true, userId };
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Get user data from Firestore
 * @param {string} userId - The user's unique ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const getUserData = async (userId) => {
  try {
    if (!userId) throw new Error('User ID is required');
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

/**
 * Update user's last login timestamp
 * @param {string} userId - The user's unique ID
 */
export const updateLastLogin = async (userId) => {
  try {
    if (!userId) return;
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};
