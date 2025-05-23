import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import CameraRecorder from './components/CameraRecorder';
import FrameSelector, { FrameTheme } from './components/FrameSelector';

function App() {
  const [selectedFrame, setSelectedFrame] = useState<FrameTheme>('choice-1');
  const cameraRef = useRef<HTMLDivElement>(null);

  // 프레임 선택 처리
  const handleSelectFrame = (frame: FrameTheme) => {
    setSelectedFrame(frame);
  };

  // 선택 버튼 클릭 시 카메라 영역으로 부드럽게 스크롤
  useEffect(() => {
    const handleSmoothScroll = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.frame-action-button')) {
        e.preventDefault();
        cameraRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    document.addEventListener('click', handleSmoothScroll);
    return () => {
      document.removeEventListener('click', handleSmoothScroll);
    };
  }, []);

  return (
    <div className="fullscreen-container">
      {/* 메인 화면 영역 - 영상 프레임과 웹캠 */}
      <div id="camera-section" ref={cameraRef} className="main-screen">
        <CameraRecorder selectedFrame={selectedFrame} />
      </div>
      
      {/* 테마 선택 영역 - 스크롤 시 보임 */}
      <div className="theme-selector-section">
        <div className="theme-selector-container">
          <FrameSelector 
            selectedFrame={selectedFrame} 
            onSelectFrame={handleSelectFrame} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;
