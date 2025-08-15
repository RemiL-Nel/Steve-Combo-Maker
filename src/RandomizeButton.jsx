import React, { useState } from 'react';

const RandomizeButton = ({ onRandomize, onCleared }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCleared, setIsCleared] = useState(true);
  // Removed difficulty UI from RandomizeButton

  const handleRandomize = () => {
    // Trigger the animation
    setIsAnimating(true);
    
    // Call the parent's randomize function
    onRandomize();
    
    // Set cleared to false when randomizing
    setIsCleared(false);
    
    // Reset animation after it completes
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleCleared = () => {
    setIsCleared(true);
    if (onCleared) {
      onCleared();
    }
  };

  // Difficulty UI removed

  if (isCleared) {
    return (
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleRandomize}
          style={{
            marginTop: '20px',
            padding: '12px 30px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
            transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          Start !
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Difficulty stars removed */}
      <button
        onClick={handleCleared}
        style={{
          marginTop: '10px',
          padding: '10px 25px',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
          ':hover': {
            backgroundColor: '#d32f2f',
            transform: 'scale(1.03)',
          },
        }}
      >
        ✅ Cleared
      </button>
    </div>
  );
};

export default RandomizeButton;
