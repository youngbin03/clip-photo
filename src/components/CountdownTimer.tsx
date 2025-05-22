import React from 'react';
import './components.css';

interface CountdownTimerProps {
  countdown: number;
  isVisible: boolean;
  themeColor?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ countdown, isVisible, themeColor = '#57b2df' }) => {
  if (!isVisible) return null;
  
  return (
    <div className="countdown-container">
      <div 
        className="countdown-number" 
        style={{ color: '#57b2df' }}
      >
        {countdown}
      </div>
    </div>
  );
};

export default CountdownTimer; 