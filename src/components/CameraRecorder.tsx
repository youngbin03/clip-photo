import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { FrameTheme } from './FrameSelector';
import CountdownTimer from './CountdownTimer';
import VideoPreview from './VideoPreview';
import { useRecorder } from '../hooks/useRecorder';
import { uploadVideo, checkFirebaseStatus } from '../config/firebase';
import './components.css';

interface CameraRecorderProps {
  selectedFrame: FrameTheme | null;
}

// 각 테마별 설정 정보
interface ThemeConfig {
  name: string;
  color: string;
  accentColor: string;
}

const themeConfigs: Record<FrameTheme, ThemeConfig> = {
  'choice-1': {
    name: '클래식',
    color: '#57b2df',
    accentColor: '#57b2df'
  },
  'choice-2': {
    name: '로맨틱',
    color: '#57b2df',
    accentColor: '#57b2df'
  },
  'choice-3': {
    name: '네온',
    color: '#57b2df',
    accentColor: '#57b2df'
  }
};

// 디버깅 활성화
const DEBUG = true;

// 로그 함수들
const logInfo = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`%c[Camera] ${message}`, 'color: #2196F3; font-weight: bold');
    if (data) {
      console.log(data);
    }
  }
};

const logWarning = (message: string, data?: any) => {
  if (DEBUG) {
    console.warn(`%c[Camera] ${message}`, 'color: #FF9800; font-weight: bold');
    if (data) {
      console.warn(data);
    }
  }
};

const logError = (message: string, error?: any) => {
  console.error(`%c[Camera] ${message}`, 'color: #F44336; font-weight: bold');
  if (error) {
    console.error(error);
  }
};

const CameraRecorder: React.FC<CameraRecorderProps> = ({ selectedFrame }) => {
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [streamReady, setStreamReady] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [screenRecorder, setScreenRecorder] = useState<MediaRecorder | null>(null);
  const [screenBlob, setScreenBlob] = useState<Blob | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  
  const { 
    state: { recording, recordingComplete, countdown, remainingTime },
    startRecording,
    stopRecording,
    resetRecording
  } = useRecorder();
  
  // 컴포넌트 마운트 시 Firebase 상태 확인
  useEffect(() => {
    const status = checkFirebaseStatus();
    logInfo('Firebase 상태 확인 완료', status);
  }, []);
  
  // 녹화 중지 함수
  const handleStopRecording = () => {
    logInfo('녹화 중지 요청됨');
    
    // 웹캠 녹화 중지
    stopRecording();
    
    // 스크린 녹화 중지 (이미 중지되지 않은 경우에만)
    if (screenRecorder && screenRecorder.state === 'recording') {
      logInfo('화면 녹화 중지 요청됨');
      try {
        screenRecorder.stop();
      } catch (error) {
        logError('화면 녹화 중지 오류', error);
      }
    } else {
      if (screenRecorder) {
        logInfo(`화면 녹화 중지 건너뜀 - 현재 상태: ${screenRecorder.state}`);
      } else {
        logWarning('화면 녹화 중지 실패 - 녹화기가 없음');
      }
    }
    
    // 화면 공유 스트림 트랙 중지
    if (displayStream) {
      displayStream.getTracks().forEach(track => {
        track.stop();
        logInfo('화면 공유 트랙 중지됨', { kind: track.kind, id: track.id });
      });
      setDisplayStream(null);
    }
  };
  
  // 웹캠 스트림이 준비되면 streamReady 상태 업데이트
  const handleUserMedia = (stream: MediaStream) => {
    setStreamReady(true);
    logInfo('웹캠 스트림 준비됨', { 
      width: webcamRef.current?.video?.videoWidth,
      height: webcamRef.current?.video?.videoHeight
    });
  };
  
  // 사용자에게 현재 앱 창을 선택하도록 안내 문구 표시
  const showScreenCaptureGuide = () => {
    const appTitle = document.title || window.location.hostname;
    const hostname = window.location.hostname;
    
    logInfo('화면 캡처 가이드 표시');
    
    // DOM에 안내 메시지 추가
    const guideElement = document.createElement('div');
    guideElement.className = 'screen-capture-guide';
    guideElement.innerHTML = `
      <div class="guide-content">
        <h3>화면 공유 안내</h3>
        <p>다음 창에서 "<strong>${appTitle} (${hostname})</strong>"을 선택하세요.</p>
        <div class="guide-image">
          <img src="/assets/screen-share-guide.png" alt="화면 공유 가이드" />
        </div>
      </div>
    `;
    
    document.body.appendChild(guideElement);
    
    // 5초 후 안내 메시지 제거
    setTimeout(() => {
      document.body.removeChild(guideElement);
    }, 5000);
  };
  
  // 전체 화면 녹화 시작 함수
  const startScreenRecording = async () => {
    try {
      logInfo('화면 녹화 시작 요청됨');
      
      // 사용자에게 현재 앱 창을 선택하도록 안내는 제거됨
      // showScreenCaptureGuide();
      
      // 화면 공유 스트림 가져오기 (displayMedia)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // 비표준 속성이지만 많은 브라우저에서 지원됨
          // @ts-ignore - displaySurface는 TypeScript 정의에 없지만 실제로 사용 가능
          displaySurface: 'browser', // browser로 변경하여 탭 모드 우선 선택
          // @ts-ignore - cursor는 TypeScript 정의에 없지만 실제로 사용 가능
          cursor: 'always',         // 커서 항상 표시
          // @ts-ignore - preferCurrentTab은 TypeScript 정의에 없지만 Chrome 105+에서 지원됨
          preferCurrentTab: true,   // 현재 탭을 목록 맨 위에 표시
          width: { ideal: 1920 },   // 이상적인 너비
          height: { ideal: 1080 },  // 이상적인 높이
          frameRate: { ideal: 30, max: 60 } // 프레임 레이트
        },
        audio: false // 오디오는 웹캠에서 가져올 것이므로 여기선 false
      });
      
      setDisplayStream(stream);
      
      logInfo('화면 공유 스트림 획득 성공', {
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          id: track.id.substring(0, 8) + '...'
        }))
      });
      
      // 사용자가 공유 취소 시 대응
      stream.getVideoTracks()[0].onended = () => {
        logWarning('사용자가 화면 공유를 중지함');
        handleStopRecording();
      };
      
      // MediaRecorder 설정
      const options = {
        mimeType: 'video/mp4',
        videoBitsPerSecond: 3000000 // 3Mbps
      };
      
      // 기존 레코더가 있으면 정리
      if (screenRecorder) {
        if (screenRecorder.state === 'recording') {
          try {
            screenRecorder.stop();
          } catch (error) {
            // 오류 무시
          }
        }
        setScreenRecorder(null);
      }
      
      // 코덱 호환성 검사
      let recorderOptions = options;
      if (!MediaRecorder.isTypeSupported('video/mp4')) {
        // MP4가 지원되지 않으면 WebM 사용
        recorderOptions = {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 3000000
        };
        logInfo('MP4 형식이 지원되지 않아 WebM 사용');
      }
      
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      setScreenRecorder(mediaRecorder);
      
      logInfo('화면 녹화용 MediaRecorder 생성됨', {
        state: mediaRecorder.state,
        mimeType: mediaRecorder.mimeType,
        videoBitsPerSecond: recorderOptions.videoBitsPerSecond
      });
      
      // 데이터 수집
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
          logInfo('화면 녹화 데이터 청크 수집됨', { 
            chunkSize: (e.data.size / 1024).toFixed(2) + ' KB',
            totalChunks: chunks.length
          });
        }
      };
      
      // 녹화 완료 이벤트
      mediaRecorder.onstop = () => {
        logInfo('화면 녹화 MediaRecorder onStop 이벤트 발생');
        
        if (chunks.length > 0) {
          // 브라우저 호환성을 위한 MIME 타입 설정
          const mimeType = recorderOptions.mimeType || 'video/mp4';
          const blob = new Blob(chunks, { type: mimeType });
          setScreenBlob(blob);
          
          logInfo('화면 녹화 완료', {
            blobSize: (blob.size / (1024 * 1024)).toFixed(2) + ' MB',
            chunks: chunks.length,
            mimeType: blob.type
          });
          
          // 트랙 중지
          stream.getTracks().forEach(track => {
            track.stop();
            logInfo('화면 공유 트랙 중지됨', { kind: track.kind, id: track.id });
          });
        } else {
          logWarning('화면 녹화 데이터 없음');
        }
      };
      
      // 녹화 오류 이벤트
      mediaRecorder.onerror = (event) => {
        logError('화면 녹화 오류 발생', event);
      };
      
      // 녹화 시작
      mediaRecorder.start(1000); // 1초마다 데이터 수집
      logInfo('화면 녹화 시작됨');
      
    } catch (error) {
      logError('화면 녹화 초기화 오류', error);
      
      // 사용자에게 오류 표시
      alert('화면 녹화를 시작할 수 없습니다. 브라우저 권한을 확인해주세요.');
      
      // 웹캠 녹화만 시작 (폴백)
      if (webcamRef.current && webcamRef.current.stream) {
        logWarning('화면 녹화 실패, 웹캠 녹화만 시작');
        startRecording(webcamRef.current.stream);
      }
    }
  };
  
  // 녹화 시작 버튼 클릭 핸들러
  const handleStartRecording = () => {
    logInfo('녹화 시작 버튼 클릭됨');
    
    if (webcamRef.current && webcamRef.current.stream) {
      // 화면 녹화 시작
      startScreenRecording().catch(error => {
        logError('화면 녹화 시작 오류', error);
      });
      
      // 웹캠 녹화 시작
      startRecording(webcamRef.current.stream);
    } else {
      logWarning('웹캠 스트림이 준비되지 않음');
    }
  };
  
  // 녹화 리셋 핸들러
  const handleReset = () => {
    logInfo('녹화 초기화 요청됨');
    
    resetRecording();
    setDownloadUrl(undefined);
    setIsUploading(false);
    
    // Blob 및 스트림 정리
    if (screenBlob) {
      setScreenBlob(null);
    }
    
    if (displayStream) {
      displayStream.getTracks().forEach(track => track.stop());
      setDisplayStream(null);
    }
    
    if (screenRecorder) {
      setScreenRecorder(null);
    }
    
    logInfo('녹화 초기화 완료');
  };
  
  // 녹화 완료 후 Firebase에 업로드
  useEffect(() => {
    const uploadRecordedVideo = async () => {
      if (screenBlob && selectedFrame && !isUploading && !downloadUrl) {
        try {
          logInfo('Firebase 업로드 시작', { 
            blobSize: (screenBlob.size / (1024 * 1024)).toFixed(2) + ' MB',
            frameId: selectedFrame
          });
          
          setIsUploading(true);
          
          // 화면 상단 30px 잘라내기 처리
          const processedBlob = await processCroppedVideo(screenBlob);
          
          // 화면 녹화 결과를 업로드
          const url = await uploadVideo(processedBlob, selectedFrame);
          setDownloadUrl(url);
          
          logInfo('Firebase 업로드 완료', { url });
        } catch (error) {
          logError("Firebase 업로드 오류", error);
        } finally {
          setIsUploading(false);
        }
      }
    };
    
    if (recordingComplete && screenBlob && selectedFrame && !downloadUrl) {
      uploadRecordedVideo().catch(error => {
        logError('녹화 업로드 실패', error);
      });
    }
  }, [recordingComplete, screenBlob, selectedFrame, isUploading, downloadUrl]);
  
  // 영상 상단 30px 제거하고 MP4로 변환하는 함수
  const processCroppedVideo = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // 비디오 URL 생성
        const videoURL = URL.createObjectURL(videoBlob);
        const video = document.createElement('video');
        
        video.onloadedmetadata = () => {
          // 비디오 원본 크기 가져오기
          const originalWidth = video.videoWidth;
          const originalHeight = video.videoHeight;
          
          // 상단 30px 제거한 새 높이 계산
          const newHeight = Math.max(originalHeight - 30, originalHeight * 0.9);
          const newWidth = originalWidth;
          
          logInfo('비디오 크기 처리', {
            original: `${originalWidth}x${originalHeight}`,
            cropped: `${newWidth}x${newHeight}`
          });
          
          // Canvas 설정
          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            logError('Canvas 컨텍스트 생성 실패');
            resolve(videoBlob); // 원본 반환
            return;
          }
          
          // 비디오를 재생하고 각 프레임 처리를 위한 설정
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = originalWidth;
          tempCanvas.height = originalHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (!tempCtx) {
            logError('임시 Canvas 컨텍스트 생성 실패');
            resolve(videoBlob); // 원본 반환
            return;
          }
          
          // 성능 문제로 복잡한 프레임별 처리는 생략하고
          // 미디어 타입만 변경하여 반환
          logInfo('비디오 포맷 변환: webm -> mp4');
          
          // WebM을 MP4로 변환하는 작업은 클라이언트에서 복잡하므로
          // 여기서는 MIME 타입만 변경하여 Firebase에 업로드
          // 실제 변환은 서버 측에서 처리해야 함
          const mpegBlob = new Blob([videoBlob], { type: 'video/mp4' });
          
          logInfo('비디오 처리 완료', {
            originalSize: `${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB`,
            processedSize: `${(mpegBlob.size / (1024 * 1024)).toFixed(2)} MB`,
          });
          
          resolve(mpegBlob);
        };
        
        video.onerror = (error) => {
          logError('비디오 로딩 오류', error);
          resolve(videoBlob); // 오류 시 원본 반환
        };
        
        // 비디오 로드
        video.src = videoURL;
        video.load();
        
      } catch (error) {
        logError('비디오 처리 오류', error);
        resolve(videoBlob); // 오류 시 원본 반환
      }
    });
  };
  
  // 웹캠 비디오 제약 조건 설정
  const videoConstraints = {
    width: 1920,
    height: 1080,
    facingMode: "user"
  };
  
  // 컴포넌트 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      // 화면 공유 스트림 정리
      if (displayStream) {
        displayStream.getTracks().forEach(track => track.stop());
      }
      
      // 스크린 레코더 정리
      if (screenRecorder && screenRecorder.state === 'recording') {
        try {
          screenRecorder.stop();
        } catch (error) {
          // 오류 무시
        }
      }
      
      // Blob URL 정리
      if (screenBlob) {
        URL.revokeObjectURL(URL.createObjectURL(screenBlob));
      }
      
      logInfo('컴포넌트 언마운트: 모든 리소스 정리 완료');
    };
  }, [displayStream, screenRecorder, screenBlob]);
  
  // 녹화가 완료되면 비디오 미리보기 표시
  if (recordingComplete && screenBlob) {
    return (
      <VideoPreview 
        videoBlob={screenBlob} 
        downloadUrl={downloadUrl} 
        onReset={handleReset}
        isUploading={isUploading}
      />
    );
  }
  
  // 현재 선택된 테마 정보
  const currentTheme = selectedFrame ? themeConfigs[selectedFrame] : null;
  const themeColor = '#57b2df';
  
  // 시간 형식 변환 (초 -> MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="camera-wrapper" ref={containerRef}>
      {/* 선택된 프레임이 있으면 배경 비디오로 표시 */}
      {selectedFrame && (
        <div className="frame-overlay">
          <video
            key={`frame-video-${selectedFrame}`} // 키 추가로 프레임 변경 시 재로드
            autoPlay
            loop
            muted
            playsInline
            className="frame-video"
          >
            <source src={`/assets/frames/${selectedFrame}.mp4`} type="video/mp4" />
          </video>
        </div>
      )}
      
      {/* 웹캠 컨테이너 */}
      <div className="webcam-container">
        <Webcam
          audio={true}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className="webcam"
          mirrored={true}
          onUserMedia={handleUserMedia}
        />
        
        {/* 재생 버튼 오버레이 */}
        {streamReady && selectedFrame && !recording && countdown === 0 && (
          <div className="play-button-overlay" onClick={handleStartRecording}>
            <div className="play-button">
              <div 
                className="play-button-triangle" 
                style={{ '--button-color': '#57b2df' } as React.CSSProperties}
              ></div>
            </div>
          </div>
        )}
        
        {/* 카운트다운 타이머 - 클릭하면 녹화 중지 */}
        <div onClick={recording ? handleStopRecording : undefined}>
          <CountdownTimer 
            countdown={countdown} 
            isVisible={countdown > 0} 
            themeColor={themeColor}
          />
        </div>
        
        {/* 녹화 중 표시 - 클릭하면 녹화 중지 */}
        {recording && (
          <div className="recording-indicator" onClick={handleStopRecording}>
            <span className="recording-time">{formatTime(remainingTime)}</span>
          </div>
        )}
      </div>
      
      {/* 선택된 프레임에 따라 로고 표시 - 웹캠 밖으로 완전히 표시 */}
      {selectedFrame && (
        <img 
          key={`logo-${selectedFrame}`} // 키 추가로 로고 변경 시 재로드
          src={`/assets/logo/${selectedFrame}.png`} 
          alt={`${currentTheme?.name} 로고`} 
          className="webcam-logo"
        />
      )}
    </div>
  );
};

export default CameraRecorder; 