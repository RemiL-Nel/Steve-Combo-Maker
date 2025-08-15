import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Debug function to check Firestore connection and data
 */
export const debugFirestore = async () => {
  console.log('🔍 Starting Firestore debug...');
  
  try {
    // Check if we can access the database
    console.log('🔌 Testing Firestore connection...');
    
    // Try to get a document from the combos collection
    const combosRef = collection(db, 'combos');
    console.log('📂 Collection reference created:', combosRef);
    
    // Try to get a single document to test read access
    const testQuery = query(combosRef, limit(1));
    console.log('🔎 Executing test query...');
    
    const querySnapshot = await getDocs(testQuery);
    console.log(`✅ Successfully connected to Firestore. Found ${querySnapshot.size} documents in 'combos' collection`);
    
    // Log document IDs if any exist
    if (querySnapshot.size > 0) {
      console.log('📄 Document IDs in combos collection:');
      querySnapshot.forEach((doc) => {
        console.log(`- ${doc.id}`, doc.data());
      });
    } else {
      console.log('ℹ️ No documents found in the combos collection');
    }
    
    return {
      success: true,
      documentCount: querySnapshot.size,
      documents: querySnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }))
    };
  } catch (error) {
    console.error('❌ Firestore debug error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error
    };
  }
};

// Export a function to check if a user has any saved combos
export const checkUserCombos = async (userId) => {
  if (!userId) {
    console.error('❌ No user ID provided to checkUserCombos');
    return [];
  }

  try {
    console.log(`🔍 Checking combos for user: ${userId}`);
    const q = query(
      collection(db, 'combos'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`✅ Found ${querySnapshot.size} combos for user ${userId}`);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error checking user combos:', error);
    throw error;
  }
};
