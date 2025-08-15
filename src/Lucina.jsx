import React, { useState, useEffect } from 'react';
// Using require to ensure webpack includes the image
const lucinaImage = require('./assets/lucina.png');

const Lucina = () => {
 
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <img 
        src={lucinaImage} 
        alt="Lucina" 
        style={{ 
          width: '100%', 
          height: 'auto',
          maxWidth: '100%',
          objectFit: 'contain'
        }} 
      />
    </div>
  );
};

export default Lucina;
