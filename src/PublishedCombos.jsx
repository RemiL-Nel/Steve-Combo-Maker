import React, { useState, useEffect, useMemo } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, TextField, Button, DialogActions, Box, Typography } from '@mui/material';
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, toggleLike, hasUserLiked, addComment, getComments, submitRating, getUserRating } from './firebase';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ComboPreview from './components/ComboPreview';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

const RatingDisplay = ({ rating = 0, size = 'small', showValue = true }) => {
  // Ensure rating is a number and handle undefined/null
  const normalizedRating = Number(rating) || 0;
  const fullStars = Math.floor(normalizedRating);
  const hasHalfStar = normalizedRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  const showEmptyState = normalizedRating === 0;

  return (
    <Box display="flex" alignItems="center">
      {showEmptyState ? (
        // Show empty stars when no rating exists
        [...Array(5)].map((_, i) => (
          <StarBorderIcon key={`empty-${i}`} color="disabled" fontSize={size} />
        ))
      ) : (
        // Show filled/half/empty stars based on rating
        <>
          {[...Array(fullStars)].map((_, i) => (
            <StarIcon key={`full-${i}`} color="primary" fontSize={size} />
          ))}
          {hasHalfStar && <StarIcon color="primary" fontSize={size} style={{ opacity: 0.5 }} />}
          {[...Array(emptyStars)].map((_, i) => (
            <StarBorderIcon key={`empty-${i}`} color="primary" fontSize={size} />
          ))}
        </>
      )}
      {showValue && (
        <Typography variant="body2" color="text.secondary" ml={1}>
          {showEmptyState ? 'No ratings' : normalizedRating.toFixed(1)}
        </Typography>
      )}
    </Box>
  );
};

const RatingInput = ({ value, onChange, disabled = false, size = 'large' }) => {
  const [hover, setHover] = useState(-1);
  
  return (
    <Box display="flex" alignItems="center">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
        <Box
          key={rating}
          onMouseEnter={() => !disabled && setHover(rating)}
          onMouseLeave={() => !disabled && setHover(-1)}
          onClick={() => !disabled && onChange(rating)}
          sx={{
            cursor: disabled ? 'default' : 'pointer',
            color: (hover >= rating || value >= rating) ? 'gold' : 'action.disabled',
            transition: 'color 0.2s',
            mx: 0.2,
            fontSize: size === 'small' ? '1rem' : '1.5rem',
            '&:hover': {
              opacity: disabled ? 1 : 0.8,
            },
          }}
        >
          {rating % 2 === 0 ? '★' : '☆'}
        </Box>
      ))}
      {value > 0 && (
        <Typography variant="body2" color="text.secondary" ml={1}>
          {value}/10
        </Typography>
      )}
    </Box>
  );
};

const PublishedCombos = () => {
  const [publishedCombos, setPublishedCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likedMap, setLikedMap] = useState({}); // { [comboId]: boolean }
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  // Sort & filter state
  const [sortBy, setSortBy] = useState('likes'); // 'likes' | 'newest'
  const [filterDi, setFilterDi] = useState('Any');
  const [filterSdi, setFilterSdi] = useState('Any');
  const [filterGoldOnly, setFilterGoldOnly] = useState(false);
  const [filterFirstMove, setFilterFirstMove] = useState('Any');
  // Grid columns (responsive: 1 on small screens, 3 otherwise)
  const [gridCols, setGridCols] = useState(3);

  useEffect(() => {
    const applyCols = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      setGridCols(w < 600 ? 1 : 3);
    };
    applyCols();
    window.addEventListener('resize', applyCols);
    return () => window.removeEventListener('resize', applyCols);
  }, []);

  useEffect(() => {
    const fetchPublishedCombos = async () => {
      try {
        setLoading(true);
        console.log('🔍 Starting to fetch published combos...');
        
        // First, check if user is authenticated
        if (!currentUser) {
          console.log('⚠️ User not authenticated, cannot fetch combos');
          setError('Please log in to view published combos');
          setLoading(false);
          return;
        }
        
        const combosRef = collection(db, 'combos');
        console.log('📂 Firestore collection reference created');
        
        // Create the query
        const q = query(
          combosRef,
          where('isPublished', '==', true),
          orderBy('publishedAt', 'desc')
        );
        
        console.log('🔎 Executing Firestore query...');
        const querySnapshot = await getDocs(q);
        console.log(`✅ Query complete. Found ${querySnapshot.size} documents`);
        
        if (querySnapshot.empty) {
          console.log('ℹ️ No published combos found in the database');
          setPublishedCombos([]);
          setError('');
          setLoading(false);
          return;
        }
        
        const combos = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Raw combo data from Firestore:', { id: doc.id, ...data });
          
          const comboData = {
            id: doc.id,
            name: data.name || 'Unnamed Combo',
            description: data.description || '',
            userName: data.userName || 'Anonymous',
            image: data.image || '',
            likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
            // Include rating information
            averageRating: typeof data.averageRating === 'number' ? data.averageRating : 0,
            ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
            // Ensure positions has default values if not present
            positions: data.positions || {
              steveX: 30,
              lucinaX: 70,
              bottomOffset: 0
            },
            // Include all settings
            settings: {
              startingMove: data.startingMove || 'Jab',
              percentage: data.percentage || 0,
              gold: data.gold || false,
              di: data.di || 'No DI',
              sdi: data.sdi || 'No SDI',
              sdiStrength: data.sdiStrength || '0',
              solution: data.solution || ''
            },
            // Also include solution at the root for backward compatibility
            solution: data.solution || '',
            // keep raw timestamp for sorting
            _publishedAtRaw: data.publishedAt ?? null,
            publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate().toLocaleDateString() : 'Unknown date'
          };
          
          console.log('Processed combo data:', comboData);
          combos.push(comboData);
        });
        
        console.log('📊 Setting combos state with:', combos);
        setPublishedCombos(combos);
        setError('');
      } catch (err) {
        console.error('Error fetching published combos:', err);
        setError('Failed to load published combos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedCombos();
  }, []);

  // Load user like state for listed combos
  useEffect(() => {
    let cancelled = false;
    const loadLikes = async () => {
      if (!currentUser || publishedCombos.length === 0) return;
      try {
        const entries = await Promise.all(
          publishedCombos.map(async (c) => [c.id, await hasUserLiked(c.id, currentUser.uid)])
        );
        if (!cancelled) {
          const next = Object.fromEntries(entries);
          setLikedMap(next);
        }
      } catch (e) {
        console.error('Failed to load like states:', e);
      }
    };
    loadLikes();
    return () => { cancelled = true; };
  }, [currentUser, publishedCombos]);

  const onToggleLike = async (e, combo) => {
    e.stopPropagation();
    if (!currentUser) {
      setSnackbar({ open: true, message: 'Connecte-toi pour liker un combo.', severity: 'warning' });
      return;
    }
    // optimistic update
    const prevLiked = !!likedMap[combo.id];
    setLikedMap((m) => ({ ...m, [combo.id]: !prevLiked }));
    setPublishedCombos((list) => list.map((c) => c.id === combo.id ? { ...c, likesCount: (c.likesCount || 0) + (prevLiked ? -1 : 1) } : c));
    try {
      const res = await toggleLike(combo.id, currentUser.uid);
      // sync with server response
      setLikedMap((m) => ({ ...m, [combo.id]: res.liked }));
      setPublishedCombos((list) => list.map((c) => c.id === combo.id ? { ...c, likesCount: res.likesCount } : c));
    } catch (err) {
      console.error('Toggle like failed:', err);
      // revert optimistic
      setLikedMap((m) => ({ ...m, [combo.id]: prevLiked }));
      setPublishedCombos((list) => list.map((c) => c.id === combo.id ? { ...c, likesCount: (c.likesCount || 0) + (prevLiked ? 1 : -1) } : c));
    }
  };

  const startingMoves = ['Jab', 'Up Tilt', 'Sfair', 'Sbair', 'Down Tilt'];

  // Build filter option lists from the loaded data
  const diOptions = useMemo(() => {
    const set = new Set(['Any', 'No DI', 'In', 'Out']);
    publishedCombos.forEach((c) => {
      const v = c?.settings?.di || 'No DI';
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [publishedCombos]);

  const sdiOptions = useMemo(() => {
    const set = new Set(['No SDI', 'In', 'Out']);
    publishedCombos.forEach((c) => {
      const v = c?.settings?.sdi || 'No SDI';
      if (v) set.add(v);
    });
    return ['Any', ...Array.from(set)];
  }, [publishedCombos]);

  const firstMoveOptions = useMemo(() => {
    const set = new Set(startingMoves);
    publishedCombos.forEach((c) => {
      const v = c?.settings?.startingMove || 'Jab';
      if (v) set.add(v);
    });
    return ['Any', ...Array.from(set)];
  }, [publishedCombos]);

  // Derived filtered & sorted list
  const visibleCombos = useMemo(() => {
    let list = publishedCombos.slice();
    list = list.filter((c) => {
      const s = c.settings || {};
      if (filterDi !== 'Any' && (s.di || 'No DI') !== filterDi) return false;
      if (filterSdi !== 'Any' && (s.sdi || 'No SDI') !== filterSdi) return false;
      if (filterGoldOnly && !s.gold) return false;
      if (filterFirstMove !== 'Any' && (s.startingMove || 'Jab') !== filterFirstMove) return false;
      return true;
    });
    if (sortBy === 'likes') {
      list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sortBy === 'newest') {
      // We only stored a formatted date string for display; fallback to original field if present
      list.sort((a, b) => {
        const aTime = a._publishedAtRaw?.seconds || 0;
        const bTime = b._publishedAtRaw?.seconds || 0;
        return bTime - aTime;
      });
    }
    return list;
  }, [publishedCombos, filterDi, filterSdi, filterGoldOnly, filterFirstMove, sortBy]);

  const encodeStateFromCombo = (combo) => {
    const s = combo.settings || combo;
    const positions = combo.positions || { steveX: 30, lucinaX: 70, bottomOffset: 0 };
    const idx = Math.max(0, startingMoves.indexOf(s.startingMove || 'Jab'));
    const stateObj = {
      p: typeof s.percentage === 'number' ? s.percentage : 0,
      g: s.gold ? 1 : 0,
      m: idx,
      di: s.di || 'No DI',
      sdi: s.sdi || 'No SDI',
      ss: s.sdiStrength || '2',
      pos: {
        sX: positions.steveX ?? 30,
        lX: positions.lucinaX ?? 70,
        bO: positions.bottomOffset ?? 0,
      },
    };
    try {
      return btoa(JSON.stringify(stateObj));
    } catch (e) {
      console.error('Failed to encode combo state:', e);
      return '';
    }
  };

  const handleComboClick = async (combo) => {
    setSelectedCombo(combo);
    setCommentLoading(true);
    setRatingLoading(true);
    
    try {
      // Load comments, user's rating, and combo details in parallel
      const [fetchedComments, userRating, comboDoc] = await Promise.all([
        getComments(combo.id),
        currentUser ? getUserRating(combo.id, currentUser.uid) : Promise.resolve(null),
        getDoc(doc(db, 'combos', combo.id))
      ]);
      
      const comboData = comboDoc.data();
      
      // Update the selected combo with the latest rating data
      const updatedCombo = {
        ...combo,
        averageRating: comboData.averageRating || 0,
        ratingCount: comboData.ratingCount || 0
      };
      
      setSelectedCombo(updatedCombo);
      setComments(fetchedComments);
      setUserRating(userRating);
      
      // Also update the combo in the list to keep it in sync
      setPublishedCombos(prev => 
        prev.map(c => c.id === combo.id ? updatedCombo : c)
      );
    } catch (error) {
      console.error('Error loading combo details:', error);
      setSnackbar({ open: true, message: 'Failed to load combo details', severity: 'error' });
    } finally {
      setCommentLoading(false);
      setRatingLoading(false);
    }
  };

  const handleRatingSubmit = async (rating) => {
    if (!currentUser || !selectedCombo) return;
    
    try {
      setRatingLoading(true);
      const { isUpdate, averageRating, ratingCount } = await submitRating(selectedCombo.id, currentUser.uid, rating);
      
      // Update the selected combo with the new rating
      const updatedCombo = {
        ...selectedCombo,
        averageRating: averageRating || rating, // Use the server-calculated average if available
        ratingCount: ratingCount || (selectedCombo.ratingCount || 0) + (isUpdate ? 0 : 1)
      };
      
      setSelectedCombo(updatedCombo);
      setUserRating(rating);
      
      // Update the combo in the list
      setPublishedCombos(prev => 
        prev.map(c => c.id === selectedCombo.id ? updatedCombo : c)
      );
      
      setSnackbar({ 
        open: true, 
        message: isUpdate ? 'Rating updated!' : 'Rating submitted!', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      setSnackbar({ 
        open: true, 
        message: error.message || 'Failed to submit rating', 
        severity: 'error' 
      });
    } finally {
      setRatingLoading(false);
    }
  };
  
  // Helper function to calculate new average rating
  const calculateNewAverage = (currentAverage, currentCount, newRating, isUpdate) => {
    if (!currentAverage) return newRating;
    
    if (isUpdate) {
      // If updating a rating, we need to know the previous rating to adjust the average correctly
      // For simplicity, we'll just return the current average and let the next refresh get the correct value
      return currentAverage;
    } else {
      // For new ratings
      const total = currentAverage * currentCount + newRating;
      return parseFloat((total / (currentCount + 1)).toFixed(1));
    }
  };

  const handleCloseDialog = () => {
    setSelectedCombo(null);
    setComment('');
    setComments([]);
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim() || !currentUser || !selectedCombo) return;
    
    try {
      setCommentLoading(true);
      const newComment = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userPhoto: currentUser.photoURL || null,
        text: comment.trim(),
      };
      
      await addComment(selectedCombo.id, newComment);
      
      // Refresh comments
      const fetchedComments = await getComments(selectedCombo.id);
      setComments(fetchedComments);
      
      setComment('');
      setSnackbar({ open: true, message: 'Comment submitted!', severity: 'success' });
    } catch (error) {
      console.error('Error submitting comment:', error);
      setSnackbar({ open: true, message: 'Failed to submit comment', severity: 'error' });
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading published combos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
        <p style={{ marginTop: '10px' }}>
          <button 
            onClick={() => window.location.reload()}
            style={styles.retryButton}
          >
            Retry
          </button>
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Published Combos</h1>
      {/* Controls */}
      <div style={styles.controlsContainer}>
        <div style={styles.controlsRow}>
          <label style={styles.controlLabel}>
            Sort
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.select}
            >
              <option value="likes">Most liked</option>
              <option value="newest">Newest</option>
            </select>
          </label>
          <label style={styles.controlLabel}>
            DI
            <select
              value={filterDi}
              onChange={(e) => setFilterDi(e.target.value)}
              style={styles.select}
            >
              {diOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label style={styles.controlLabel}>
            SDI
            <select
              value={filterSdi}
              onChange={(e) => setFilterSdi(e.target.value)}
              style={styles.select}
            >
              {sdiOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label style={{ 
            ...styles.controlLabel, 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 8, 
            '@media (maxWidth: 600px)': {
              minWidth: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              marginTop: 4,
            }
          }}>
            <input
              type="checkbox"
              checked={filterGoldOnly}
              onChange={(e) => setFilterGoldOnly(e.target.checked)}
            />
            Gold only
          </label>
          <label style={styles.controlLabel}>
            First move
            <select
              value={filterFirstMove}
              onChange={(e) => setFilterFirstMove(e.target.value)}
              style={styles.select}
            >
              {firstMoveOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      
      {visibleCombos.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No published combos yet. Be the first to publish one!</p>
          <button 
            onClick={() => navigate('/')}
            style={styles.createButton}
          >
            Create a Combo
          </button>
        </div>
      ) : (
        <div style={{ ...styles.combosGrid, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
          {visibleCombos.map((combo) => (
            <div 
              key={combo.id} 
              style={styles.comboCard}
              onClick={() => handleComboClick(combo)}
            >
              <div style={styles.comboHeader}>
                <h3 style={styles.comboName}>{combo.name || 'Untitled Combo'}</h3>
                <div style={styles.meta}>
                  <span style={styles.author}>by {combo.userName || 'Anonymous'}</span>
                  <button
                    aria-label="Like"
                    title={likedMap[combo.id] ? 'Unlike' : 'Like'}
                    onClick={(e) => onToggleLike(e, combo)}
                    style={{
                      marginLeft: 12,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #444',
                      background: likedMap[combo.id] ? '#ff3b3b' : '#2a2a2a',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    {likedMap[combo.id] ? '♥' : '♡'} {combo.likesCount || 0}
                  </button>
                </div>
              </div>
              
              {/* Combo Preview */}
              <div style={styles.previewContainer}>
                {combo.solution && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Solution:</div>
                    <div style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontStyle: 'italic',
                      fontSize: '0.9em'
                    }}>
                      {combo.solution}
                    </div>
                  </div>
                )}
                {combo.image ? (
                  <>
                    <img
                      src={combo.image}
                      alt="Combo Preview"
                      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, border: '2px solid #444' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    {/* Info bar under image, same as ComboPreview info */}
                    <div style={{
                      padding: '8px 10px',
                      backgroundColor: '#fff',
                      borderTop: '1px solid #eee',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      fontSize: '14px',
                      color: '#333',
                      borderRadius: 8,
                      marginTop: 8,
                    }}>
                      {(() => {
                        const s = combo.settings || combo;
                        const percentage = typeof s?.percentage === 'number' ? s.percentage : 0;
                        const gold = !!s?.gold;
                        return (
                          <>
                            <div><strong>Starting Move:</strong> {s?.startingMove || 'Jab'}</div>
                            <div><strong>Percentage:</strong> {percentage}%</div>
                            <div><strong>{gold ? 'Gold' : 'No Gold'}:</strong> {gold ? '✅' : '❌'}</div>
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <ComboPreview 
                    positions={combo.positions}
                    settings={{
                      ...(combo.settings || combo), // Include all existing settings
                      solution: combo.solution // Make sure solution is included
                    }}
                  />
                )}
              </div>
              
              {combo.description && (
                <p style={styles.comboDescription}>{combo.description}</p>
              )}
              <div style={styles.comboMeta}>
                <span style={styles.comboMetaItem}>
                  <strong>Moves:</strong> {combo.moves?.length || 0}
                </span>
                <span style={styles.comboMetaItem}>
                  <strong>DI:</strong> {combo.settings?.di || 'No DI'}
                </span>
                <span style={styles.comboMetaItem}>
                  <strong>SDI:</strong> {combo.settings?.sdi || 'No SDI'}
                </span>
                <span style={styles.comboMetaItem}>
                  <strong>SDI Strength:</strong> {combo.settings?.sdiStrength || '0'}
                </span>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RatingDisplay 
                    rating={combo.averageRating ? (combo.averageRating / 2) : 0} 
                    size="small"
                    showValue={false}
                  />
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: combo.ratingCount ? '#aaa' : '#666',
                    fontStyle: combo.ratingCount ? 'normal' : 'italic'
                  }}>
                    {combo.ratingCount ? `(${combo.ratingCount})` : 'No ratings'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Combo Details Dialog */}
      <Dialog 
        open={!!selectedCombo} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: '#2a2a2a',
            color: '#fff',
            position: 'relative',
            zIndex: 9999, // Ensure it's above other elements
          },
        }}
        BackdropProps={{
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        {selectedCombo && (
          <>
            <DialogTitle>{selectedCombo.name || 'Combo Details'}</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Combo Preview */}
                <div style={{ 
                  backgroundColor: '#2a2a2a', 
                  borderRadius: '8px', 
                  padding: '15px',
                  textAlign: 'center'
                }}>
                  {selectedCombo.image ? (
                    <img
                      src={selectedCombo.image}
                      alt="Combo Preview"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                  ) : (
                    <div style={{ padding: '20px' }}>
                      <ComboPreview 
                        positions={selectedCombo.positions}
                        settings={{
                          ...(selectedCombo.settings || selectedCombo), // Include all existing settings
                          solution: selectedCombo.solution // Make sure solution is included
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Combo Details */}
                <div style={{ 
                  backgroundColor: 'rgba(45, 45, 45, 0.8)',
                  borderRadius: '8px',
                  padding: '15px'
                }}>
                  <h3 style={{ marginTop: 0, color: '#4CAF50' }}>Combo Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><strong>Starting Move:</strong> {selectedCombo.settings?.startingMove || 'Jab'}</div>
                    <div><strong>Percentage:</strong> {selectedCombo.settings?.percentage || 0}%</div>
                    <div><strong>Gold:</strong> {selectedCombo.settings?.gold ? 'Yes' : 'No'}</div>
                    <div><strong>DI:</strong> {selectedCombo.settings?.di || 'No DI'}</div>
                    <div><strong>SDI:</strong> {selectedCombo.settings?.sdi || 'No SDI'}</div>
                    <div><strong>SDI Strength:</strong> {selectedCombo.settings?.sdiStrength || '0'}</div>
                    {selectedCombo.settings?.tool && (
                      <div><strong>Tool:</strong> {selectedCombo.settings.tool}</div>
                    )}
                  </div>
                  {selectedCombo.description && (
                    <div style={{ marginTop: '15px' }}>
                      <strong>Description:</strong>
                      <p style={{ margin: '5px 0 0 0', color: '#ddd' }}>{selectedCombo.description}</p>
                    </div>
                  )}
                  {selectedCombo.solution && (
                    <div style={{ 
                      marginTop: '15px',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 204, 0, 0.1)',
                      borderRadius: '6px',
                      borderLeft: '3px solid #ffcc00'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '8px',
                        color: '#ffcc00',
                        fontSize: '0.95em',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Combo Solution:
                      </div>
                      <div style={{
                        fontStyle: 'italic',
                        color: '#fff',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-line'
                      }}>
                        {selectedCombo.solution}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating Section */}
                <div style={{ margin: '20px 0', padding: '15px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>
                    {userRating ? 'Your Rating' : 'Rate this Combo'}
                  </h3>
                  {currentUser ? (
                    <div>
                      <RatingInput 
                        value={userRating || 0} 
                        onChange={handleRatingSubmit}
                        disabled={ratingLoading}
                      />
                      <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                        Click on a star to rate from 1 to 10
                      </Typography>
                    </div>
                  ) : (
                    <Typography color="text.secondary">
                      Please sign in to rate this combo
                    </Typography>
                  )}
                </div>

                {/* Comments Section */}
                <div>
                  <h3 style={{ margin: '20px 0 10px 0', color: '#4CAF50' }}>Comments</h3>
                  
                  {/* Comment Form */}
                  <div style={{ marginBottom: '20px' }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      disabled={!currentUser || commentLoading}
                      InputProps={{
                        style: { 
                          backgroundColor: '#2a2a2a',
                          color: '#fff',
                          borderRadius: '4px',
                          marginBottom: '10px'
                        }
                      }}
                    />
                    <Button
                      onClick={handleCommentSubmit}
                      variant="contained"
                      color="primary"
                      disabled={!comment.trim() || !currentUser || commentLoading}
                      style={{ marginBottom: '20px' }}
                    >
                      {commentLoading ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
                    {commentLoading && comments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
                        Loading comments...
                      </div>
                    ) : comments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#777' }}>
                        No comments yet. Be the first to comment!
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div 
                          key={comment.id} 
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '12px',
                            borderLeft: '3px solid #4CAF50'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            {comment.userPhoto && (
                              <img 
                                src={comment.userPhoto} 
                                alt={comment.userName}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  marginRight: '10px',
                                  objectFit: 'cover'
                                }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                                {comment.userName}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                {comment.createdAt?.toLocaleString() || 'Unknown date'}
                              </div>
                            </div>
                          </div>
                          <div style={{ color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>
                            {comment.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
            <DialogActions style={{ padding: '16px 24px' }}>
              <Button 
                onClick={handleCloseDialog}
                style={{ color: '#aaa' }}
              >
                Close
              </Button>
              <Button 
                onClick={handleCommentSubmit}
                variant="contained"
                color="primary"
                disabled={!comment.trim()}
              >
                Submit Solution
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    position: 'relative',
    zIndex: 1,
  },
  controlsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '8px 12px',
    margin: '0 auto 12px',
    maxWidth: '100%',
    width: 'fit-content',
    '@media (maxWidth: 600px)': {
      width: '100%',
      padding: '6px 8px',
      textAlign: 'center',
    },
  },
  controlsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    '@media (maxWidth: 600px)': {
      gap: '6px 8px',
    },
  },
  controlLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: '#ddd',
    fontSize: 14,
    '@media (maxWidth: 600px)': {
      fontSize: 12,
      minWidth: '30%',
      '&:nth-child(3n)': {
        marginRight: 0,
      },
    },
  },
  select: {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #444',
    background: '#2a2a2a',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 'inherit',
    '@media (maxWidth: 600px)': {
      padding: '4px 6px',
      fontSize: 12,
    },
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: '30px',
    fontSize: '2.5rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    color: '#fff',
  },
  loadingSpinner: {
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTop: '4px solid #4CAF50',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 99, 71, 0.1)',
    borderLeft: '4px solid #ff6347',
    padding: '20px',
    margin: '20px 0',
    color: '#ff6b6b',
  },
  errorText: {
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    color: '#aaa',
  },
  createButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.2s',
  },
  combosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '8px',
    padding: '8px',
  },
  comboCard: {
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '10px',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      borderColor: 'rgba(76, 175, 80, 0.5)',
    },
  },
  comboHeader: {
    marginBottom: '10px',
  },
  previewContainer: {
    margin: '8px 0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  comboName: {
    marginTop: 0,
    color: '#4CAF50',
    fontSize: '1.1rem',
  },
  comboDescription: {
    color: '#bbb',
    margin: '8px 0',
    minHeight: '40px',
  },
  comboMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#999',
    marginTop: '10px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  comboMetaItem: {
    display: 'flex',
    alignItems: 'center',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#45a049',
    },
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
};

export default PublishedCombos;
