import React from 'react';

const ShareButton = ({ onShare, disabled = false }) => {
  const [copied, setCopied] = React.useState(false);

  const handleClick = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        marginTop: '15px',
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: copied ? '#4CAF50' : '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
        ':hover': {
          backgroundColor: copied ? '#45a049' : '#0b7dda',
        },
        opacity: disabled ? 0.7 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {copied ? 'Copied to clipboard! 📋' : 'Share Combo 🔗'}
    </button>
  );
};

export default ShareButton;
