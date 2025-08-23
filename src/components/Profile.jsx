import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserCombos, deleteCombo, shareCombo, publishCombo, updateUserDisplayName } from '../firebase';
import { 
  Container, 
  Typography, 
  Box, 
  Avatar, 
  Button, 
  Card, 
  CardHeader, 
  CardActions, 
  Chip, 
  Divider,
  Grid,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import ComboPreview from './ComboPreview';

const Profile = () => {
  const { currentUser } = useAuth();
  const [savedCombos, setSavedCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [deleting, setDeleting] = useState({});
  const fileInputRef = useRef(null);
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    let isMounted = true;
    
    const fetchUserCombos = async () => {
      if (!currentUser?.uid) {
        if (isMounted) {
          setLoading(false);
          setError('You must be logged in to view saved combos.');
        }
        return;
      }
      
      try {
        if (isMounted) {
          setLoading(true);
          setError('');
        }
        
        console.log('Fetching combos for user:', currentUser.uid);
        const combos = await getUserCombos(currentUser.uid);        
        if (isMounted) {
          console.log('Received combos:', combos);
          setSavedCombos(combos);
          
          if (combos.length === 0) {
            setError('You haven\'t saved any combos yet.');
          }
        }
      } catch (err) {
        console.error('Error fetching user combos:', err);
        if (isMounted) {
          setError('Failed to load your saved combos. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserCombos();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const [publishing, setPublishing] = useState({});
  const [shareLink, setShareLink] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);

  const handleDeleteCombo = async (comboId) => {
    try {
      setDeleting(prev => ({ ...prev, [comboId]: true }));
      await deleteCombo(comboId, currentUser.uid);
      
      // Remove the deleted combo from the state
      setSavedCombos(prev => prev.filter(combo => combo.id !== comboId));
      
      // Show success message
      setSnackbar({ open: true, message: 'Combo deleted successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error deleting combo:', error);
      setSnackbar({ open: true, message: `Failed to delete combo: ${error.message}` , severity: 'error' });
    } finally {
      setDeleting(prev => {
        const newState = { ...prev };
        delete newState[comboId];
        return newState;
      });
      setConfirmOpen(false);
      setToDeleteId(null);
    }
  };

  const openDeleteConfirm = (comboId) => {
    setToDeleteId(comboId);
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setConfirmOpen(false);
    setToDeleteId(null);
  };

  const handleShareCombo = (comboId) => {
    const link = shareCombo(comboId);
    setShareLink(link);
    
    // Copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
      setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
    }).catch(err => {
      console.error('Failed to copy:', err);
      // Fallback if clipboard API fails
      prompt('Copy this link to share:', link);
    });
  };

  const handlePublishCombo = async (comboId) => {
    if (!currentUser?.uid) return;
    try {
      setPublishing(prev => ({ ...prev, [comboId]: true }));
      await publishCombo(comboId, currentUser.uid);
      // Update local state to reflect published status
      setSavedCombos(prev => prev.map(c => c.id === comboId ? { ...c, isPublished: true, publishedAt: { toDate: () => new Date() } } : c));
    } catch (err) {
      console.error('Error publishing combo:', err);
      setSnackbar({ open: true, message: `Failed to publish combo: ${err.message}`, severity: 'error' });
    } finally {
      setPublishing(prev => {
        const n = { ...prev };
        delete n[comboId];
        return n;
      });
    }
  };

  return (
    <>
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mt: 4, mb: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box sx={{ mb: 3 }}>
            <Avatar 
              src={currentUser?.photoURL} 
              alt={currentUser?.displayName || currentUser?.email}
              sx={{ 
                width: 120, 
                height: 120, 
                fontSize: '3rem',
                boxShadow: 3,
                margin: '0 auto',
              }}
            >
              {currentUser?.email?.charAt(0).toUpperCase()}
            </Avatar>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
              {currentUser?.displayName || currentUser?.email}
            </Typography>
            <IconButton 
              aria-label="edit username"
              onClick={async () => {
                const current = currentUser?.displayName || '';
                const next = prompt('Enter new username', current);
                if (next == null) return; // cancelled
                const trimmed = next.trim();
                if (!trimmed) {
                  setSnackbar({ open: true, message: 'Username cannot be empty', severity: 'warning' });
                  return;
                }
                try {
                  setUpdatingName(true);
                  await updateUserDisplayName(trimmed);
                  // Force a local refresh of UI name
                  // Note: currentUser object may update asynchronously; optimistic update here
                  // eslint-disable-next-line no-self-assign
                  window.location.reload();
                } catch (e) {
                  console.error('Failed to update username:', e);
                  setSnackbar({ open: true, message: `Failed to update username: ${e.message}` , severity: 'error' });
                } finally {
                  setUpdatingName(false);
                }
              }}
              disabled={updatingName}
              sx={{ ml: 1 }}
            >
              {updatingName ? <CircularProgress size={20} /> : <EditIcon />}
            </IconButton>
          </Box>
          
          <Typography variant="body1" color="textSecondary" paragraph>
            {currentUser?.email}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            Member since {currentUser?.metadata?.creationTime ? 
              format(new Date(currentUser.metadata.creationTime), 'MMMM yyyy') : 'N/A'}
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
          My Saved Combos
          <Chip 
            label={`${savedCombos.length} saved`} 
            color="primary" 
            size="small" 
            sx={{ ml: 2, mb: 0.5 }}
          />
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ my: 2 }}>{error}</Typography>
        ) : savedCombos.length === 0 ? (
          <Box textAlign="center" my={4}>
            <Typography variant="body1" color="textSecondary">
              You haven't saved any combos yet.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              href="/"
              sx={{ mt: 2 }}
            >
              Create Your First Combo
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {savedCombos.map((combo) => (
              <Grid item xs={4} sm={4} md={4} key={combo.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                      cursor: 'pointer',
                      textDecoration: 'none'
                    },
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <CardHeader
                    title={
                      <>
                        <div>{combo.name || 'Unnamed Combo'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>
                          Difficulty: {combo.difficulty || 'Not rated'}
                        </div>
                      </>
                    }
                    subheader={`Created ${formatDate(combo.createdAt)}`}
                    titleTypographyProps={{
                      variant: 'h6',
                      noWrap: true,
                      title: combo.name,
                      sx: { 
                        color: 'white',
                        maxWidth: '200px',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }
                    }}
                    sx={{ '& .MuiCardHeader-title': { color: 'white' } }}
                    subheaderTypographyProps={{
                      variant: 'caption',
                      color: 'text.secondary'
                    }}
                    action={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {combo.isPublished ? (
                          <Chip label="Published" color="success" size="small" />
                        ) : (
                          <Chip label="Private" color="warning" size="small" />
                        )}
                        {/* Difficulty removed from profile display */}
                      </Box>
                    }
                  />
                  <Box sx={{ mt: 1, mb: 1, borderRadius: 1, overflow: 'hidden' }}>
                    {combo.image ? (
                      <>
                        <img
                          src={combo.image}
                          alt="Combo Preview"
                          style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '2px solid #444' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        {/* Info bar under image, same content as ComboPreview */}
                        <Box sx={{
                          padding: '8px 10px',
                          backgroundColor: '#fff',
                          borderTop: '1px solid #eee',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px',
                          fontSize: '14px',
                          color: '#333',
                          borderRadius: 1,
                          mt: 1,
                        }}>
                          {(() => {
                            const s = {
                              startingMove: combo.startingMove || 'Jab',
                              percentage: typeof combo.percentage === 'number' ? combo.percentage : 0,
                              gold: !!combo.gold,
                              tool: combo.tool || 'None'
                            };
                            return (
                              <>
                                <div><strong>Starting Move:</strong> {s.startingMove}</div>
                                <div><strong>Percentage:</strong> {s.percentage}%</div>
                                <div><strong>{s.gold ? 'Gold' : 'No Gold'}:</strong> {s.gold ? '✅' : '❌'}</div>
                                <div><strong>Tool:</strong> {s?.tool || 'None'}</div>
                              </>
                            );
                          })()}
                        </Box>
                      </>
                    ) : (
                      <ComboPreview
                        positions={combo.positions || { steveX: 30, lucinaX: 70, bottomOffset: 0 }}
                        settings={{
                          startingMove: combo.startingMove || 'Jab',
                          percentage: typeof combo.percentage === 'number' ? combo.percentage : 0,
                          gold: !!combo.gold,
                          di: combo.di || 'No DI',
                          sdi: combo.sdi || 'No SDI',
                          sdiStrength: combo.sdiStrength || '0',
                          character: combo.character, // Pass the saved character image
                        }}
                      />
                    )}
                  </Box>
                  
                  {(combo.solution || combo.settings?.solution) && (
                    <Box sx={{
                      p: 2,
                      background: 'linear-gradient(135deg, #424242 0%, #616161 100%)',
                      borderRadius: '8px',
                      mt: 1.5,
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid #757575',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #9e9e9e, #e0e0e0)',
                        animation: 'rainbow 3s linear infinite',
                        '@keyframes rainbow': {
                          '0%': { backgroundPosition: '0% 50%' },
                          '100%': { backgroundPosition: '100% 50%' }
                        }
                      }
                    }}>
                      <Typography variant="subtitle2" sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        '&::before': {
                          content: '"💡"',
                          mr: 1,
                          fontSize: '1.2em'
                        }
                      }}>
                        Solution :
                      </Typography>
                      <Typography variant="body2" sx={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: 1.6,
                        position: 'relative',
                        pl: 2,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '0.3em',
                          height: '60%',
                          width: '3px',
                          background: 'linear-gradient(to bottom, #bdbdbd, #e0e0e0)',
                          borderRadius: '3px'
                        }
                      }}>
                        {(combo.solution || combo.settings?.solution)?.length > 40 
                          ? `${(combo.solution || combo.settings?.solution).substring(0, 37)}` 
                          : (combo.solution || combo.settings?.solution)}
                        {(combo.solution || combo.settings?.solution)?.length > 40 && (
                          <Typography 
                            component="span" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.8em',
                              ml: 0.5,
                              cursor: 'pointer',
                              '&:hover': {
                                textDecoration: 'underline',
                                color: 'white'
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const fullText = combo.solution || combo.settings?.solution;
                              if (e.target.textContent === '...') {
                                e.target.textContent = fullText;
                              } else {
                                e.target.textContent = fullText.length > 40 ? `${fullText.substring(0, 37)}...` : fullText;
                              }
                            }}
                          >
                            ...
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  )}
                  
                  <CardActions sx={{ justifyContent: !combo.isPublished ? 'space-between' : 'flex-end', pt: 0, gap: 1 }}>
                    {!combo.isPublished && (
                      <Button 
                        variant="contained" 
                        color="primary"
                        size="small"
                        onClick={() => handlePublishCombo(combo.id)}
                        disabled={!!publishing[combo.id]}
                      >
                        {publishing[combo.id] ? 'Publishing...' : 'Publish'}
                      </Button>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => window.location.href = `/combo/${combo.id}`}
                        sx={{
                          '&:hover': { backgroundColor: 'primary.dark' },
                          transition: 'all 0.2s',
                          textTransform: 'none',
                          px: 1.5,
                          fontSize: '0.75rem',
                          minWidth: 'auto'
                        }}
                      >
                        Retry
                      </Button>
                      <IconButton 
                        aria-label="share" 
                        color="primary"
                        onClick={() => handleShareCombo(combo.id)}
                        size="small"
                        sx={{
                          '&:hover': { backgroundColor: 'primary.light', color: 'white' },
                          transition: 'all 0.2s'
                        }}
                      >
                        <ShareIcon />
                      </IconButton>
                      <IconButton 
                        aria-label="delete" 
                        color="error"
                        onClick={() => openDeleteConfirm(combo.id)}
                        disabled={deleting[combo.id]}
                        size="small"
                        sx={{
                          '&:hover': { backgroundColor: 'error.light', color: 'white' },
                          transition: 'all 0.2s',
                          opacity: deleting[combo.id] ? 0.7 : 1
                        }}
                      >
                        {deleting[combo.id] ? <CircularProgress size={20} /> : <DeleteIcon />}
                      </IconButton>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
    <Dialog
      open={confirmOpen}
      onClose={closeDeleteConfirm}
      aria-labelledby="confirm-delete-title"
    >
      <DialogTitle id="confirm-delete-title">Delete this combo?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This action cannot be undone. Are you sure you want to delete this combo?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDeleteConfirm} color="inherit">Cancel</Button>
        <Button 
          onClick={() => toDeleteId && handleDeleteCombo(toDeleteId)} 
          color="error" 
          variant="contained"
          disabled={toDeleteId ? !!deleting[toDeleteId] : false}
        >
          {toDeleteId && deleting[toDeleteId] ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
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
    </>
  );
};

export default Profile;
