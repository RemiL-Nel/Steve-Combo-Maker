import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Steve from './Steve.jsx';
import Lucina from './Lucina.jsx';
import RandomizeButton from './RandomizeButton.jsx';
import ShareButton from './ShareButton.jsx';
import SaveComboButton from './SaveComboButton';
import html2canvas from 'html2canvas';
import TwitterIcon from '@mui/icons-material/Twitter';
import styles from './Arena.module.css';

const Arena = () => {
  const arenaImage = require('./assets/arena.jpg');
  const arenaRef = useRef(null);
  const previewAreaRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [positions, setPositions] = useState({
    steveX: 30,
    lucinaX: 70,
    bottomOffset: 0,
  });
  const [settings, setSettings] = useState({
    percentage: 0,
    gold: false,
    startingMove: 'Jab',
    di: 'No DI',          // 'In' | 'Out' | 'No DI'
    sdi: 'No SDI',        // 'Out' | 'In' | 'No SDI'
    sdiStrength: '0',     // '0' | '1' | '2' | '3'
    tool: 'None',         // 'Wood' | 'Stone' | 'Gold' | 'Iron' | 'Diamond' | 'None'
  });
  const [randomized, setRandomized] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  
  // Memoize combo data to prevent unnecessary re-renders
  const comboData = useMemo(() => ({
    percentage: settings.percentage,
    gold: settings.gold,
    startingMove: settings.startingMove,
    di: settings.di,
    sdi: settings.sdi,
    sdiStrength: settings.sdiStrength,
    positions,
    difficulty: 5,
  }), [
    settings.percentage, 
    settings.gold, 
    settings.startingMove, 
    settings.di, 
    settings.sdi, 
    settings.sdiStrength,
    positions
  ]);

  // Memoize save handler
  const handleSave = useCallback(() => {
    console.log('Combo saved successfully!');
  }, []);

  
  
  // Load state from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const comboParam = params.get('combo');
    
    if (comboParam) {
      try {
        const loadedState = decodeState(comboParam);
        
        // Update settings and positions from the loaded state
        setSettings({
          percentage: loadedState.percentage,
          gold: loadedState.gold,
          startingMove: loadedState.startingMove,
          di: loadedState.di || 'No DI',
          sdi: loadedState.sdi || 'No SDI',
          sdiStrength: loadedState.sdiStrength || '0',
        });
        
        // Update character positions
        if (loadedState.positions) {
          setPositions(loadedState.positions);
        }
      } catch (e) {
        console.error('Error decoding combo:', e);
      }
    }
    setShareableLink(generateShareableLink());
  }, []);
  
  const startingMoves = ['Jab', 'Up Tilt (Front)', 'Up Tilt (Back)', 'Sfair', 'Sbair', 'Down Tilt'];

  // Encode the current state to a shareable string
  const encodeState = (state) => {
    const stateObj = {
      p: state.percentage,
      g: state.gold ? 1 : 0,
      m: startingMoves.indexOf(state.startingMove),
      di: state.di || 'No DI',
      sdi: state.sdi || 'No SDI',
      ss: state.sdiStrength || '0',
      t: state.tool || 'None',
      // Add positions to the state
      pos: {
        sX: positions.steveX,
        lX: positions.lucinaX,
        bO: positions.bottomOffset
      }
    };
    return btoa(JSON.stringify(stateObj));
  };

  // Decode a shareable string to state
  const decodeState = (encoded) => {
    try {
      const decoded = JSON.parse(atob(encoded));
      return {
        percentage: decoded.p,
        gold: Boolean(decoded.g),
        startingMove: startingMoves[decoded.m] || 'Jab',
        di: decoded.di || 'No DI',
        sdi: decoded.sdi || 'No SDI',
        sdiStrength: decoded.ss || '0',
        tool: decoded.t || 'None',
        // Extract positions if they exist, otherwise use defaults
        positions: decoded.pos ? {
          steveX: decoded.pos.sX || 30,
          lucinaX: decoded.pos.lX || 70,
          bottomOffset: decoded.pos.bO || 0
        } : {
          steveX: 30,
          lucinaX: 70,
          bottomOffset: 0
        }
      };
    } catch (e) {
      return null;
    }
  };

  // Generate shareable link
  const generateShareableLink = useCallback(() => {
    const state = encodeState(settings);
    return `${window.location.origin}${window.location.pathname}?combo=${state}`;
  }, [settings]);

  // Copy shareable link to clipboard
  const handleShare = () => {
    const link = generateShareableLink();
    navigator.clipboard.writeText(link);
    return link;
  };

  // Update shareable link when settings change
  useEffect(() => {
    setShareableLink(generateShareableLink());
  }, [settings]);

  // Update character positions based on viewport size
  const updateBottomOffset = () => {
    if (arenaRef.current) {
      const arenaHeight = arenaRef.current.clientHeight;
      const viewportWidth = window.innerWidth;
      
      // Adjust bottom offset based on viewport size
      let bottomOffset = arenaHeight * 0.5;
      setPositions(prev => ({
        ...prev,
        bottomOffset,
      }));
    }
  };
  
  // Add resize event listener
  React.useEffect(() => {
    window.addEventListener('resize', updateBottomOffset);
    updateBottomOffset(); // Initial call
    return () => window.removeEventListener('resize', updateBottomOffset);
  }, []);

  // Capture the preview area using html2canvas and return a base64 JPEG
  const getPreview = useCallback(async () => {
    if (!previewAreaRef.current) return null;
    try {
      const canvas = await html2canvas(previewAreaRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.error('Failed to capture preview:', e);
      return null;
    }
  }, []);

  // Default positions and settings
  const defaultPositions = {
    steveX: 30,
    lucinaX: 70,
    bottomOffset: 0
  };
  
  // Define tools with their weights (Wood: 30%, Stone: 10%, Gold: 15%, Iron: 15%, Diamond: 30%)
  const tools = [
    { name: 'Wood', weight: 30 },
    { name: 'Stone', weight: 10 },
    { name: 'Gold', weight: 15 },
    { name: 'Iron', weight: 15 },
    { name: 'Diamond', weight: 30 },
  ];

  // Function to randomly select a tool based on weights
  const getRandomTool = () => {
    const totalWeight = tools.reduce((sum, tool) => sum + tool.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const tool of tools) {
      if (random < tool.weight) {
        return tool.name;
      }
      random -= tool.weight;
    }
    
    return tools[0].name; // Fallback to first tool
  };

  const defaultSettings = {
    percentage: 0,
    gold: false,
    startingMove: 'Jab',
    tool: 'None'
  };

  // Function to reset to default values
  const resetToDefaults = () => {
    setPositions({ ...defaultPositions });
    setSettings({ ...defaultSettings });
    setRandomized(false);
  };

  // Function to randomize both positions and settings
  const randomizeAll = async (options = {}) => {
    const { difficulty = 5, reset = false } = options;
    
    if (reset) {
      // Reset to default values
      setPositions(options.positions || { ...defaultPositions });
      setSettings({ 
        ...defaultSettings, 
        di: 'No DI', 
        sdi: 'No SDI', 
        sdiStrength: '0',
        tool: 'None'
      });
      setSettings(options.settings || { ...defaultSettings });
      setRandomized(false);
      return;
    }
    
    // Randomize positions with wider range
    // Pick a center between 20% and 80% and a small separation of 3% to 8%
    const centerX = 20 + Math.random() * 60; // 20-80
    const separation = 3 + Math.random() * 5; // 3-8
    let nextSteveX = centerX - separation / 2;
    let nextLucinaX = centerX + separation / 2;
    // Clamp into safe bounds so they stay on stage
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    nextSteveX = clamp(nextSteveX, 20, 80);
    nextLucinaX = clamp(nextLucinaX, 20, 80);

    // Calculate consistent bottom offset based on arena height
    const arenaHeight = arenaRef.current?.clientHeight || 0;
    const newBottomOffset = arenaHeight * 0.5; // Adjust this multiplier as needed

    // 50% chance to flip sides so Lucina can be on the left of Steve
    const flip = Math.random() < 0.5;
    const steveXFinal = flip ? nextLucinaX : nextSteveX;
    const lucinaXFinal = flip ? nextSteveX : nextLucinaX;

    setPositions({
      steveX: steveXFinal,
      lucinaX: lucinaXFinal,
      bottomOffset: newBottomOffset
    });
    
    // Select random move uniformly
    const randomMove = startingMoves[Math.floor(Math.random() * startingMoves.length)];
    
    // Set max percentage based on the move and difficulty
    let maxPercentage = 100;
    if (randomMove === 'Down Tilt') {
      maxPercentage = 20 + (difficulty * 3); // 20-50% based on difficulty
    } else if (randomMove === 'Jab') {
      maxPercentage = 70 + (difficulty * 2); // 70-90% based on difficulty
    } else if (randomMove === 'Sfair' || randomMove === 'Sbair') {
      maxPercentage = 50 + (difficulty * 3); // 50-80% based on difficulty
    }
    
    // Randomize settings with difficulty influence
    const percentage = Math.floor(Math.random() * (maxPercentage + 1));
    const gold = Math.random() > 0.8; // 20% chance for gold, could be adjusted by difficulty
    const tool = getRandomTool(); // Get random tool based on weights

    // DI: 'In' | 'Out' | 'No DI' with 10% for 'No DI'
    const rDI = Math.random();
    let di = 'In';
    if (rDI < 0.1) di = 'No DI';
    else di = rDI < 0.55 ? 'In' : 'Out'; // split remaining ~45%/45%

    // SDI: if DI is 'No DI' then force 'No SDI'; otherwise 70% chance and match DI direction
    const rSDI = Math.random();
    let sdi = 'No SDI';
    if (di === 'No DI') {
      sdi = 'No SDI';
    } else if (rSDI >= 0.3) {
      // SDI present: pair with DI direction
      sdi = di; // DI is either 'In' or 'Out'
    }

    // SDI Strength: '0' if No SDI; else 70% '1', 25% '2', 5% '3'
    let sdiStrength = '0';
    if (sdi !== 'No SDI') {
      const rSS = Math.random();
      if (rSS < 0.70) sdiStrength = '1';
      else if (rSS < 0.95) sdiStrength = '2';
      else sdiStrength = '3';
    }
    
    setSettings({
      percentage,
      gold,
      startingMove: randomMove,
      di,
      sdi,
      sdiStrength,
      tool,
    });
    
    // Set randomized to true to show the save and share buttons
    setRandomized(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // Occupy the viewport height minus AppBar (~64px) to avoid page scroll
        height: 'calc(100vh - 64px)',
        backgroundColor: '#242424',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      
      <div ref={previewAreaRef} style={{ position: 'relative', width: '100%', maxWidth: '900px' }}>
        
        <div style={{
          position: 'relative',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          border: '6px solid #2a2a2a',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 1,
          }
        }}>
          <img
            ref={arenaRef}
            src={arenaImage}
            onLoad={updateBottomOffset}
            alt="Arena"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              position: 'relative',
              zIndex: 0,
            }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          {/* Steve */}
          <div
            style={{
              position: 'absolute',
              width: '10%',
              maxWidth: '120px',
              bottom: `${positions.bottomOffset}px`,
              left: `${positions.steveX}%`,
              transform: 'translateX(-50%)',
              transition: 'left 0.2s ease-in-out',
              zIndex: 2,
            }}
          >
            <Steve />
          </div>
        </div>

        {/* Lucina */}
        <div
          style={{
            position: 'absolute',
            width: '15%',
            maxWidth: '120px',
            bottom: `${positions.bottomOffset}px`,
            left: `${positions.lucinaX}%`,
            transform: 'translateX(-50%)',
            transition: 'left 0.2s ease-in-out',
            zIndex: 2,
          }}
        >
          <Lucina />
        </div>
      </div>

      <div style={{ 
        position: 'fixed',
        bottom: '50px',
        left: '0',
        right: '0',
        display: 'flex', 
        gap: '10px', 
        padding: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        backgroundColor: 'rgba(36, 36, 36, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        '@media (max-width: 600px)': {
          padding: '8px',
          gap: '6px',
          '& > *': {
            flex: '1 1 30%',
            minWidth: '90px',
            maxWidth: '120px',
            '& .MuiButton-root': {
              fontSize: '0.7rem',
              padding: '6px 4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }
          }
        },
        '@media (max-width: 400px)': {
          '& > *': {
            flex: '1 1 45%',
            minWidth: '80px',
            '& .MuiButton-root': {
              fontSize: '0.65rem',
              padding: '4px 2px'
            }
          }
        }
      }}>
        <RandomizeButton 
          onRandomize={randomizeAll} 
          onCleared={() => setRandomized(false)} 
        />
        {randomized && (
          <>
            <SaveComboButton 
              comboData={comboData}
              getPreview={getPreview}
              onSave={handleSave}
            />
            <ShareButton onShare={handleShare} />
          </>
        )}
      </div>
      
      {/* Display current settings */}
      <div className={styles.settingsPanel}>
        <div className={styles.settingsGrid}>
          <div className={styles.column}>
            <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)' }}>Percents: <strong>{settings.percentage}%</strong></p>
            <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)' }}>Gold: <strong>{settings.gold ? 'Yes' : 'No'}</strong></p>
            <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)' }}>DI: <strong>{settings.di}</strong></p>
          </div>
          <div className={styles.column}>
            <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)' }}>SDI: <strong>{settings.sdi}</strong></p>
            <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)' }}>SDI Strength: <strong>{settings.sdiStrength}</strong></p>
            <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)' }}>Tool: <strong>{settings.tool}</strong></p>
          </div>
        </div>
        <p style={{ 
          fontSize: 'clamp(1rem, 5vw, 1.4rem)', 
          margin: '10px 0 5px',
          color: '#4CAF50',
          fontWeight: 'bold',
          textAlign: 'center',
          width: '100%'
        }}>
          Starting Move:
        </p>
        <p style={{ 
          fontSize: 'clamp(1.2rem, 6vw, 1.8rem)',
          margin: '5px 0',
          color: '#FFD700',
          fontWeight: 'bold',
          textShadow: '0 0 5px rgba(0,0,0,0.5)',
          textAlign: 'center',
          width: '100%'
        }}>
          {settings.startingMove}
        </p>
      </div>
      
      {/* Footer */}
      <footer style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        zIndex: 1000,
      }}>
        <a 
          href="https://twitter.com/messages/compose?recipient_id=moicnelou" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            color: '#1DA1F2',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '15px',
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(29, 161, 242, 0.2)'
          }}
          onMouseOver={e => {
            e.currentTarget.style.backgroundColor = 'rgba(29, 161, 242, 0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Give me feedback!
        </a>
        
        <a 
          href="https://twitter.com/moicnelou" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: '#888',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontFamily: 'Arial, sans-serif',
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          onMouseOver={e => {
            e.currentTarget.style.color = '#1DA1F2';
          }}
          onMouseOut={e => {
            e.currentTarget.style.color = '#888';
          }}
        >
          <span>made by</span>
          <span style={{ fontWeight: 'bold', color: '#fff' }}>moicnelou</span>
          <TwitterIcon style={{ fontSize: '1rem', marginLeft: '3px' }} />
        </a>
      </footer>
    </div>
  );
};

export default Arena;
