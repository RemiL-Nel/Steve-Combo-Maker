const Lucina = ({ image }) => {
 
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <img 
        src={image} 
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
