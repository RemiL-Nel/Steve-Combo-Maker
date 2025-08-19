import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { saveCombo } from './firebase';
import { useAuth } from './contexts/AuthContext';
import './styles/animations.css';

const SaveComboButton = ({ comboData, onSave, getPreview, children }) => {
  const { currentUser } = useAuth();
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [solution, setSolution] = useState('');
  const [difficulty, setDifficulty] = useState(typeof comboData?.difficulty === 'number' ? comboData.difficulty : 5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedComboId, setSavedComboId] = useState(null);
  const nameInputRef = useRef(null);
  const solutionInputRef = useRef(null);

  const handleSave = async () => {
    if (!currentUser) {
      setShowLoginMessage(true);
      setTimeout(() => setShowLoginMessage(false), 2000);
      return;
    }

    if (!name.trim()) {
      setError('Please enter a name for your combo');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      
      // Optionally capture preview image
      let imageDataUrl = null;
      if (typeof getPreview === 'function') {
        try {
          imageDataUrl = await getPreview();
          console.log('[SaveComboButton] Captured image size:', imageDataUrl ? imageDataUrl.length : 0);
        } catch (e) {
          console.error('getPreview failed:', e);
        }
      }

      // Prepare combo data
      const comboToSave = {
        ...comboData,
        name: name.trim(),
        solution: solution.trim(),
        difficulty: Number(difficulty) || 5,
        isPublished: false,
        publishedAt: null,
        ...(imageDataUrl ? { image: imageDataUrl } : {}),
      };
      
      // Save the combo
      const comboRef = await saveCombo(comboToSave);
      
      setSavedComboId(comboRef.id);
      
      setIsModalOpen(false);
      setName('');
      setSolution('');
      
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to save combo:', err);
      setError('Failed to save combo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Use React Portal to render the modal outside of the component's DOM hierarchy
  const ModalPortal = ({ children }) => {
    return typeof document !== 'undefined' 
      ? ReactDOM.createPortal(children, document.body)
      : null;
  };

  return (
    <>
      <div style={{ display: 'inline-block' }}>
        <button
          onClick={() => currentUser ? setIsModalOpen(true) : setShowLoginMessage(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: currentUser ? '#4CAF50' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: currentUser ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold',
            margin: '10px',
            transition: 'all 0.3s ease',
            opacity: currentUser ? 1 : 0.8,
            ':hover': {
              backgroundColor: currentUser ? '#45a049' : '#cccccc',
              transform: currentUser ? 'scale(1.05)' : 'none',
            },
          }}
        >
          💾 {currentUser ? 'Save Combo' : 'Login to Save'}
        </button>
        
        {showLoginMessage && !currentUser && (
          <div 
            className="login-message"
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#ff4444',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              marginTop: '5px',
              zIndex: 1000,
            }}
          >
            Please log in to save combos
          </div>
        )}
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              backgroundColor: '#2d2d2d',
              padding: '25px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              zIndex: 10000,
              transform: 'translateZ(0)',
              WebkitOverflowScrolling: 'touch',
              boxSizing: 'border-box'
            }}>
              <div>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>Save Your Combo</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                color: '#ccc',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}>
                Combo Name *
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Maintain focus after state update
                  setTimeout(() => nameInputRef.current.focus(), 0);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                placeholder="My Awesome Combo"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #444',
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#ccc',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}>
                Solution of the Combo
              </label>
              <input
                ref={solutionInputRef}
                type="text"
                value={solution}
                onChange={(e) => {
                  setSolution(e.target.value);
                  // Maintain focus after state update
                  setTimeout(() => solutionInputRef.current.focus(), 0);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                placeholder="e.g. Up Tilt, Nil 1, Up Tilt, Nil 2, Up Smash"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #444',
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  fontSize: '16px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#ccc',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}>
                Difficulty (1-10)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[...Array(10)].map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setDifficulty(i + 1)}
                    style={{
                      color: i < difficulty ? '#FFD700' : '#666',
                      fontSize: 'clamp(16px, 4vw, 22px)',
                      cursor: 'pointer',
                      textShadow: i < difficulty ? '0 0 5px rgba(255, 215, 0, 0.7)' : 'none',
                      transition: 'transform 0.15s ease',
                      '@media (min-width: 480px)': {
                        fontSize: '22px',
                      },
                    }}
                    title={`${i + 1}`}
                  >
                    {i < difficulty ? '★' : '☆'}
                  </span>
                ))}
                <span style={{ 
                  color: '#FFD700', 
                  fontWeight: 'bold', 
                  marginLeft: 6,
                  fontSize: 'clamp(14px, 3.5vw, 18px)'
                }}>
                  {difficulty}/10
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                Click stars to set difficulty
              </div>
            </div>

            {error && (
              <div style={{
                color: '#ff6b6b',
                marginBottom: '15px',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#555',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    marginRight: '10px',
                  }}
                >
                  Cancel
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !name.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    opacity: (isSaving || !name.trim()) ? 0.7 : 1,
                    minWidth: '120px',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Privately'}
                </button>
              </div>
            </div>
            
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
};

export default SaveComboButton;
