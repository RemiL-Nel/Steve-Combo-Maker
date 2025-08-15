import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  logout as firebaseLogout,
  onAuthStateChangedListener,
  getCurrentUser,
  sendPasswordReset
} from '../firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = (email, password) => {
    return signUpWithEmail(email, password);
  };

  const login = (email, password) => {
    return signInWithEmail(email, password);
  };

  const loginWithGoogle = () => {
    return signInWithGoogle();
  };

  const logout = () => {
    return firebaseLogout();
  };

  const resetPassword = (email) => {
    return sendPasswordReset(email);
  };

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
