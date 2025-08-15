import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Menu, MenuItem, IconButton, Tooltip } from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import WelcomePopup from './WelcomePopup';

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  // Check if first visit on component mount
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
    handleMenuClose();
  };

  return (
    <>
    <AppBar position="static">
      <Toolbar>
        <Typography 
          variant="h6" 
          component={RouterLink}
          to="/"
          sx={{ 
            flexGrow: 1,
            fontFamily: '"Press Start 2P", monospace',
            letterSpacing: '1px',
            color: 'inherit',
            textDecoration: 'none',
            cursor: 'pointer'
          }}
        >
          Steve Combo Maker
        </Typography>
        
        {currentUser ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button color="inherit" component={RouterLink} to="/published">
              Browse Combos
            </Button>
            <Button color="inherit" component={RouterLink} to="/profile">
              Profile
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              <Tooltip title="Help">
                <IconButton
                  onClick={() => setShowWelcome(true)}
                  size="small"
                  sx={{ color: 'white' }}
                >
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={handleMenuOpen}
                size="small"
                aria-controls="menu-appbar"
                aria-haspopup="true"
              >
                <Avatar 
                  alt={currentUser.displayName || currentUser.email} 
                  src={currentUser.photoURL} 
                  sx={{ width: 32, height: 32 }}
                />
              </IconButton>
            </Box>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem component={RouterLink} to="/" onClick={handleMenuClose}>Home</MenuItem>
              <MenuItem component={RouterLink} to="/published" onClick={handleMenuClose}>Published Combos</MenuItem>
              <MenuItem component={RouterLink} to="/profile" onClick={handleMenuClose}>Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" component={RouterLink} to="/login">
              Login
            </Button>
            <Button color="inherit" component={RouterLink} to="/signup">
              Sign Up
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>

    {/* Fixed bottom-right attribution badge shown on all pages */}
    <Box
      sx={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        backgroundColor: '#0b1f3a',
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 3,
        boxShadow: 2,
        px: 1.5,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        zIndex: 1200,
      }}
    >
      <a
        href="https://twitter.com/moicnelou"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          color: 'inherit',
          gap: 8,
        }}
      >
        <TwitterIcon sx={{ color: '#1DA1F2' }} fontSize="small" />
        <span style={{ fontSize: 12, color: 'inherit' }}>Made by @moicnelou</span>
      </a>
    </Box>
      {/* Welcome Popup */}
    <WelcomePopup 
      isOpen={showWelcome} 
      onClose={() => setShowWelcome(false)} 
    />
    </>
  );
};

export default Navigation;
