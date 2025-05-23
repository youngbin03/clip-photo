import React from 'react';
import './components.css';

// 프레임 테마 타입 정의 - 새로운 테마 추가
export type FrameTheme = 'choice-1' | 'choice-2' | 'choice-3' | 'choice-4' | 'choice-5' | 'choice-6';

// 테마 그룹 정의
type ThemeGroup = {
  name: string;
  description: string;
  frames: FrameTheme[];
};

interface FrameSelectorProps {
  selectedFrame: FrameTheme | null;
  onSelectFrame: (frame: FrameTheme) => void;
}

const FrameSelector: React.FC<FrameSelectorProps> = ({ selectedFrame, onSelectFrame }) => {
  // 테마 그룹 정의
  const themeGroups: ThemeGroup[] = [
    {
      name: '라치오스 테마',
      description: '역동적인 영상 프레임으로 활기찬 느낌을 표현합니다. 모션 그래픽이 특징인 테마입니다.',
      frames: ['choice-1', 'choice-2', 'choice-3']
    },
    {
      name: '하이리온 테마',
      description: '세련된 이미지 프레임으로 고급스러운 분위기를 연출합니다. 독특한 색감과 레이아웃이 특징입니다.',
      frames: ['choice-4', 'choice-5', 'choice-6']
    }
  ];

  return (
    <div className="frame-selector-wrapper">
      {themeGroups.map((group, index) => (
        <div key={index} className="theme-group">
          <h3 className="theme-group-title">{group.name}</h3>
          <p className="theme-group-description">{group.description}</p>
          
          <div className="frame-selector">
            {group.frames.map((frame) => (
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
        </div>
      ))}
    </div>
  );
};

export default FrameSelector; 