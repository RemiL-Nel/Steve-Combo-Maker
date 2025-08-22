// utils/importImages.js
function importAll(r) {
    return r.keys().map(r);
  }
  
  // Ça va prendre toutes les images .png dans ton dossier ./assets
  const images = importAll(require.context('../assets', false, /\.webp$/));
  
  export default images;
  