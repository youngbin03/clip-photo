import React from 'react';
import './components.css';

// 프레임 테마 타입 정의
export type FrameTheme = 'choice-1' | 'choice-2' | 'choice-3';

interface FrameSelectorProps {
  selectedFrame: FrameTheme | null;
  onSelectFrame: (frame: FrameTheme) => void;
}

const FrameSelector: React.FC<FrameSelectorProps> = ({ selectedFrame, onSelectFrame }) => {
  const frames: FrameTheme[] = ['choice-1', 'choice-2', 'choice-3'];

  return (
    <div className="frame-selector">
      {frames.map((frame) => (
        <button
          key={frame}
          onClick={() => onSelectFrame(frame)}
          className={`frame-button ${
            selectedFrame === frame 
              ? 'selected' 
              : ''
          }`}
        >
          <img
            src={`/assets/tags/${frame}.png`}
            alt={`프레임 ${frame}`}
            className="frame-button-image"
          />
        </button>
      ))}
    </div>
  );
};

export default FrameSelector; 