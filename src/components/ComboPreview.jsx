import React, { useRef, forwardRef } from 'react';
import Steve from '../Steve';
import Lucina from '../Lucina';

// Import arena image
const arenaImage = require('../assets/arena.jpg');

const ComboPreview = forwardRef(({ positions, settings }) => {
  const previewRef = useRef(null);
  

  // Default positions if not provided
  const {
    steveX = 30,
    lucinaX = 70,
    bottomOffset = 0
  } = positions || {};

  return (
    <div style={styles.container}>
      <div ref={previewRef} style={{ ...styles.arena, position: 'relative', width: '100%', height: '100%' }}>
        {/* Arena Background */}
        <div style={styles.arenaBackground}>
          <img 
            src={arenaImage} 
            alt="Arena" 
            style={styles.arenaImage}
          />
        </div>
        
        {/* Steve Character */}
        <div style={{
          ...styles.character,
          left: `${steveX}%`,
          bottom: `${10 + (bottomOffset || 0)}%`, // 10% from bottom by default, plus any offset
          transform: 'scaleX(-1)', // Face right
          zIndex: 20
        }}>
          <Steve 
            move={settings?.startingMove || 'Jab'}
            percentage={settings?.percentage || 0}
            gold={settings?.gold || false}
            width="70px"
            height="auto"
          />
        </div>

        {/* Lucina Character */}
        <div style={{
          ...styles.character,
          left: `${lucinaX}%`,
          bottom: `${10 + (bottomOffset || 0)}%`, // 10% from bottom by default, plus any offset
          zIndex: 15
        }}>
          <Lucina 
            width="70px"
            height="auto"
            isHit={true}
          />
        </div>
      </div>
      
      {/* Combo Info */}
      <div style={styles.info}>
        <div style={styles.infoItem}>
          <strong>Starting Move:</strong> {settings?.startingMove || 'Jab'}
        </div>
        <div style={styles.infoItem}>
          <strong>Percentage:</strong> {settings?.percentage || 0}%
        </div>
        <div style={styles.infoItem}>
          <strong>{settings?.gold ? 'Gold' : 'No Gold'}:</strong> {settings?.gold ? '✅' : '❌'}
        </div>
        {settings?.solution && (
          <div style={{
            ...styles.infoItem, 
            marginTop: '10px', 
            paddingTop: '10px', 
            borderTop: '1px solid #444',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
            padding: '10px',
            margin: '10px -5px 0 -5px'
          }}>
            <div style={{
              fontWeight: 'bold', 
              marginBottom: '5px',
              color: '#ffcc00',
              fontSize: '0.9em',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Combo Solution:
            </div>
            <div style={{
              fontStyle: 'italic',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              padding: '8px',
              borderRadius: '4px',
              borderLeft: '3px solid #ffcc00',
              fontSize: '0.9em',
              lineHeight: '1.4'
            }}>
              {settings.solution}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Add display name for better debugging
ComboPreview.displayName = 'ComboPreview';

// Add new styles for preview image
const styles = {
  container: {
    width: '100%',
  },
  arena: {
    position: 'relative',
    width: '100%',
    height: '180px',
    overflow: 'hidden',
    borderRadius: '8px',
    border: '2px solid #444',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
  },
  arenaBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1
  },
  arenaImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.8
  },
  character: {
    position: 'absolute',
    bottom: '10%',
    transition: 'all 0.3s ease',
    zIndex: 10,
    filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.5))'
  },

  info: {
    padding: '8px 10px',
    backgroundColor: '#fff',
    borderTop: '1px solid #eee',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: '14px'
  },
  infoItem: {
    margin: '4px 0',
    fontSize: '14px',
    color: '#333',
  },
  goldBadge: {
    display: 'inline-block',
    backgroundColor: '#ffd700',
    color: '#8b6b00',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};

export default ComboPreview;
