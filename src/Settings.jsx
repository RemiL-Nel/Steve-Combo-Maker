import React, { useState } from 'react';

const Settings = () => {

    const [percentage, setPercentage] = useState(0);
    const [gold, setGold] = useState(false);

    const handlePercentageChange = (event) => {
        setPercentage(event.target.value);
    };
    const handleGoldChange = (event) => {
        setGold(event.target.checked);
    };

  return (
    <div>
        <h1>Percentage</h1>
        <input type="range" min="0" max="100" value={percentage} onChange={handlePercentageChange} />
      <h1>Gold ?
      <input type="checkbox" onChange={handleGoldChange} /></h1>
    </div>
  );
};

export default Settings;
