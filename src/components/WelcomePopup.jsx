import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const WelcomePopup = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(3px)',
    }}>
      <div 
        ref={modalRef}
        style={{
          backgroundColor: '#1e1e1e',
          padding: '2rem',
          borderRadius: '10px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{
            color: '#FFD700',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <HelpOutlineIcon />
            Welcome to Steve Combo Maker!
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            &times;
          </button>
        </div>

        <div style={{ color: '#e0e0e0', lineHeight: '1.6' }}>
          <p>Welcome to the Steve Combo Maker! Here's how to use it:</p>
          
          <h3 style={{ color: '#FFD700', margin: '1.5rem 0 0.5rem' }}>Getting Started!</h3>
          <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
            <li>Click the <strong>Start !</strong> button to generate a new combo starter</li>
            <li>Once done, boot up smash, copy the parameters generated and try to kill Lucina !</li>
            <li>Not done until you haven't killed Lucina with a True Combo!</li>
            <li>After that, you can press Cleared to finish it, or save it to your profile !</li>
            <li>you can also share your combos with friends using the share button</li>
            <li>If you wish to publish them to everyone, you can simply go to your profile and press Publish !</li>
          </ul>

          <h3 style={{ color: '#FFD700', margin: '1.5rem 0 0.5rem' }}><strong>I'll take any feedback so please if you have any, send me a message on Twitter @moicnelou !</strong></h3>
   

          <p style={{ marginTop: '1.5rem', fontStyle: 'italic' }}>
            Have fun practicing your Steve combos! You can always access this help menu by clicking the <strong>?</strong> in the top right corner.
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '1.5rem',
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WelcomePopup;
