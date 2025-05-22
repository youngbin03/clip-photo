import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './components.css';

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
      };
    }
  }, [videoBlob]);
  
  // 자동 다운로드 기능 추가
  useEffect(() => {
    if (localVideoUrl && !downloadTriggered.current) {
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
  }, [localVideoUrl]);
  
  // 로컬에서 비디오 다운로드 함수
  const handleLocalDownload = () => {
    if (localVideoUrl) {
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
  
  // 다운로드 링크 생성 (모바일 접근용)
  const getDirectDownloadUrl = (url: string) => {
    if (!url) return '';
    // Firebase 스토리지 URL인 경우, 다운로드 파라미터 추가
    if (url.includes('firebasestorage.googleapis.com')) {
      // 이미 URL에 토큰이 있는 경우를 처리
      if (url.includes('?')) {
        return `${url}&alt=media&downloadToken=download`;
      } else {
        return `${url}?alt=media&downloadToken=download`;
      }
    }
    return url;
  };
  
  // 실제 표시할 URL 결정 (Firebase 업로드 실패 시 로컬 URL 사용)
  const displayUrl = downloadUrl || localVideoUrl;
  const isLocalUrl = !downloadUrl && !!localVideoUrl;
  const directDownloadUrl = downloadUrl ? getDirectDownloadUrl(downloadUrl) : '';
  
  return (
    <div className="video-preview-container">
      <h2 className="preview-title">녹화가 완료되었습니다</h2>
      
      <div className="video-container">
        {localVideoUrl && (
          <video 
            src={localVideoUrl} 
            controls 
            autoPlay 
            loop 
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
      </div>
      
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
              
              {!isLocalUrl && directDownloadUrl && (
                <div className="mobile-download-guide">
                  <p>모바일에서 다운로드하려면:</p>
                  <ol>
                    <li>아래 다운로드 링크를 탭하세요</li>
                    <li>영상이 열리면 길게 누르거나 공유 버튼을 이용해 저장하세요</li>
                  </ol>
                  <a 
                    href={directDownloadUrl} 
                    className="mobile-download-link"
                    download={`photobooth_video_${Date.now()}.webm`}
                  >
                    직접 다운로드 링크
                  </a>
                </div>
              )}
              
              {isLocalUrl ? (
                <p className="local-warning">* 로컬 저장된 영상은 현재 기기에서만 접근 가능합니다</p>
              ) : (
                <p className="cors-warning">* 일부 기기에서는 CORS 정책으로 인해 직접 다운로드가 제한될 수 있습니다</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VideoPreview; 