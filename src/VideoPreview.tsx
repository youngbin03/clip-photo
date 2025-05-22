import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './components.css';
// import { convertWebmToMp4 } from '../utils/videoConverter';

interface VideoPreviewProps {
  videoBlob: Blob;
  downloadUrl?: string;
  onReset: () => void;
  isUploading?: boolean;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  videoBlob, 
  downloadUrl, 
  onReset,
  isUploading = false
}) => {
  const [localVideoUrl, setLocalVideoUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [shareSupported, setShareSupported] = useState<boolean>(false);
  const downloadTriggered = useRef(false);
  const [mp4Blob, setMp4Blob] = useState<Blob | null>(null);
  const [mp4Url, setMp4Url] = useState<string>('');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionProgress, setConversionProgress] = useState<number>(0);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  
  // 모바일 기기 감지
  useEffect(() => {
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    setIsMobileDevice(checkMobile());
  }, []);
  
  useEffect(() => {
    // Web Share API 지원 여부 확인
    setShareSupported(!!navigator.share);
    
    // Blob에서 URL 생성
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setLocalVideoUrl(url);
      
      // 컴포넌트 언마운트 시 URL 해제
      return () => {
        URL.revokeObjectURL(url);
        if (mp4Url) URL.revokeObjectURL(mp4Url);
      };
    }
  }, [videoBlob, mp4Url]);
  
  // 자동 다운로드 기능 추가
  useEffect(() => {
    if (localVideoUrl && !downloadTriggered.current && !isMobileDevice) {
      const timer = setTimeout(() => {
        try {
          console.log('자동 다운로드 시작...');
          const a = document.createElement('a');
          a.href = localVideoUrl;
          a.download = `photobooth_video_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          downloadTriggered.current = true;
          console.log('자동 다운로드 완료');
        } catch (error) {
          console.error('다운로드 오류:', error);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [localVideoUrl, isMobileDevice]);
  
  // 모바일 호환 MP4 변환 시작
  const handleConvertToMp4 = async () => {
    if (!videoBlob) return;
    
    try {
      setIsConverting(true);
      setConversionProgress(0);
      
      // 다이렉트 링크 생성 방식 (iOS 호환)
      // MP4 변환 없이 HLS 또는 호환 가능한 형식으로 직접 제공
      const mp4Filename = `photobooth_video_${Date.now()}.mp4`;
      
      // createObjectURL 대신 파일 다운로드 방식
      const formData = new FormData();
      formData.append('video', videoBlob, 'video.webm');
      
      // 임시 서버 URL을 통해 모바일 기기에서도 열 수 있는 링크 제공
      // 실제 프로덕션에서는 서버 측에서 변환 필요
      const tempUrl = downloadUrl || URL.createObjectURL(videoBlob);
      
      setMp4Url(tempUrl);
      setConversionProgress(100);
      setIsConverting(false);
      
      // 다운로드 팝업 표시
      if (isMobileDevice) {
        alert('오른쪽 상단의 "공유" 버튼을 누르거나 비디오를 길게 눌러 저장하세요.');
      }
    } catch (error) {
      console.error('MP4 변환 실패:', error);
      setIsConverting(false);
    }
  };
  
  // 로컬에서 비디오 다운로드 함수
  const handleLocalDownload = () => {
    if (mp4Url) {
      // MP4 다운로드
      const a = document.createElement('a');
      a.href = mp4Url;
      a.download = `photobooth_video_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (localVideoUrl) {
      // WebM 다운로드
      const a = document.createElement('a');
      a.href = localVideoUrl;
      a.download = `photobooth_video_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  // URL 복사 함수
  const copyToClipboard = () => {
    // 로컬 URL 또는 Firebase URL 중 사용 가능한 것 사용
    const urlToCopy = downloadUrl || localVideoUrl;
    
    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        (err) => {
          console.error('URL 복사 실패:', err);
        }
      );
    }
  };
  
  // Web Share API를 사용한 공유 함수
  const handleShare = async () => {
    // 로컬 URL 또는 Firebase URL 중 사용 가능한 것 사용
    const urlToShare = downloadUrl || localVideoUrl;
    
    if (navigator.share && urlToShare) {
      try {
        await navigator.share({
          title: '내 영상 공유하기',
          text: '내 특별한 순간을 확인해보세요!',
          url: urlToShare,
        });
        console.log('공유 성공');
      } catch (error) {
        console.log('공유 취소 또는 실패:', error);
      }
    }
  };
  
  // 실제 표시할 URL 결정 (Firebase 업로드 실패 시 로컬 URL 사용)
  const displayUrl = downloadUrl || localVideoUrl;
  const isLocalUrl = !downloadUrl && !!localVideoUrl;
  
  return (
    <div className="video-preview-container">
      <h2 className="preview-title">녹화가 완료되었습니다</h2>
      
      <div className="video-container">
        {localVideoUrl && (
          <video 
            src={mp4Url || localVideoUrl} 
            controls 
            autoPlay 
            loop 
            playsInline
            className="preview-video"
          />
        )}
      </div>
      
      <div className="preview-actions">
        <button onClick={handleLocalDownload} className="download-button">
          영상 다운로드
        </button>
        <button onClick={onReset} className="reset-button">
          다시 촬영하기
        </button>
        {shareSupported && displayUrl && (
          <button onClick={handleShare} className="share-button share-native">
            공유하기
          </button>
        )}
        {isMobileDevice && !mp4Url && !isConverting && (
          <button onClick={handleConvertToMp4} className="mp4-convert-button">
            모바일 재생용 변환
          </button>
        )}
      </div>
      
      {isConverting && (
        <div className="conversion-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${conversionProgress}%` }}
            ></div>
          </div>
          <p>변환 중... {conversionProgress}%</p>
        </div>
      )}
      
      {isUploading ? (
        <div className="download-info uploading">
          <h3>영상 업로드 중...</h3>
          <div className="loading-spinner"></div>
          <p>잠시만 기다려주세요</p>
        </div>
      ) : displayUrl ? (
        <div className="download-info">
          <h3>공유 링크 {isLocalUrl && "(로컬 저장)"}</h3>
          <div className="copy-link-container">
            <input 
              type="text" 
              value={displayUrl} 
              readOnly 
              className="copy-link-input"
            />
            <button 
              onClick={copyToClipboard} 
              className="copy-button"
            >
              {copied ? '복사됨!' : '복사'}
            </button>
          </div>
          
          <div className="qrcode-container">
            <div className="qrcode-wrapper">
              <QRCodeSVG value={displayUrl} size={200} />
            </div>
            <div className="qrcode-instructions">
              <h4>모바일에서 확인하기</h4>
              <p>QR 코드를 스캔하여 영상을 모바일에서 확인하세요</p>
              
              {isMobileDevice ? (
                <div className="mobile-guide">
                  <p>영상을 재생한 후 길게 눌러 저장할 수 있습니다</p>
                </div>
              ) : (
                <div className="mobile-download-guide">
                  <p>모바일에서 다운로드하려면:</p>
                  <ol>
                    <li>QR 코드를 스캔하여 링크를 엽니다</li>
                    <li>"모바일 재생용 변환" 버튼을 탭합니다</li>
                    <li>영상을 길게 누르거나 공유 버튼을 눌러 저장합니다</li>
                  </ol>
                </div>
              )}
              
              {isLocalUrl ? (
                <p className="local-warning">* 로컬 저장된 영상은 현재 기기에서만 접근 가능합니다</p>
              ) : (
                <div>
                  <p className="mobile-tip">* 아이폰에서는 Safari 브라우저로 열어주세요</p>
                  <p className="mobile-tip">* 안드로이드에서는 Chrome 브라우저를 사용하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VideoPreview; 