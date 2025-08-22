
import steveImage from './assets/steve.webp';

const Steve = () => {


  return (
    <div style={{ width: '100%', height: '100%' }}>
      <img 
        src={steveImage} 
        alt="Steve" 
        style={{ 
          width: '100%', 
          height: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          zIndex: 3,
        }} 
      />
    </div>
  );
};

export default Steve;
