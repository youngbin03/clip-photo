import { useState, useRef, useCallback } from 'react';

interface RecorderState {
  recording: boolean;
  recordingComplete: boolean;
  mediaRecorder: MediaRecorder | null;
  videoBlob: Blob | null;
  countdown: number;
  elapsedTime: number;
  remainingTime: number;
}

interface UseRecorderReturn {
  state: RecorderState;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => void;
  resetRecording: () => void;
}

// 녹화 시간 (초)
const RECORDING_DURATION = 15;
// 카운트다운 시간 (초)
const COUNTDOWN_DURATION = 3;
// 디버깅 활성화
const DEBUG = true;

// 로그 함수들
const logInfo = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`%c[Recorder] ${message}`, 'color: #4CAF50; font-weight: bold');
    if (data) {
      console.log(data);
    }
  }
};

const logWarning = (message: string, data?: any) => {
  if (DEBUG) {
    console.warn(`%c[Recorder] ${message}`, 'color: #FFC107; font-weight: bold');
    if (data) {
      console.warn(data);
    }
  }
};

const logError = (message: string, error?: any) => {
  console.error(`%c[Recorder] ${message}`, 'color: #F44336; font-weight: bold');
  if (error) {
    console.error(error);
  }
};

export const useRecorder = (): UseRecorderReturn => {
  const [state, setState] = useState<RecorderState>({
    recording: false,
    recordingComplete: false,
    mediaRecorder: null,
    videoBlob: null,
    countdown: 0,
    elapsedTime: 0,
    remainingTime: RECORDING_DURATION
  });
  
  // 청크 데이터 참조 저장용
  const chunksRef = useRef<BlobPart[]>([]);
  // 타이머 ID 참조
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  // 종료 타이머 ID
  const endTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  // MediaRecorder 참조
  const recorderRef = useRef<MediaRecorder | null>(null);
  // 이전 시간 기록
  const lastTimeRef = useRef<number>(0);
  // 녹화 시작 시간
  const recordingStartTimeRef = useRef<number>(0);
  // 강제 종료 시간
  const forceEndTimeRef = useRef<number>(0);
  
  // 녹화 중지 함수
  const stopRecording = useCallback(() => {
    logInfo('녹화 중지 함수 호출됨');
    
    // 이미 녹화가 중지된 상태라면 중복 호출 방지
    if (!state.recording) {
      logInfo('이미 녹화가 중지되었습니다.');
      return;
    }
    
    // 녹화 중지 상태로 먼저 설정하여 중복 호출 방지
    setState(prev => ({
      ...prev,
      recording: false
    }));
    
    // 모든 타이머 중지
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
      logInfo('타이머 중지됨');
    }
    
    if (endTimerIdRef.current) {
      clearTimeout(endTimerIdRef.current);
      endTimerIdRef.current = null;
      logInfo('종료 타이머 중지됨');
    }
    
    if (recorderRef.current) {
      logInfo('MediaRecorder 정지 호출');
      try {
        // 이미 중지된 상태가 아닌 경우에만 stop 호출
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
          logInfo('MediaRecorder 정지 성공');
        } else {
          logInfo('MediaRecorder가 이미 중지된 상태입니다.');
        }
      } catch (error) {
        logError('MediaRecorder 정지 오류', error);
        
        // 강제 종료 시도
        setState(prev => ({
          ...prev,
          recordingComplete: true,
          remainingTime: 0,
          elapsedTime: RECORDING_DURATION
        }));
      }
    } else {
      logWarning('MediaRecorder 객체가 없음');
      
      // recorder가 없는 경우에도 상태 업데이트
      setState(prev => ({
        ...prev,
        recordingComplete: true,
        remainingTime: 0,
        elapsedTime: RECORDING_DURATION
      }));
    }
  }, [state.recording]);
  
  // 녹화 초기화 및 시작
  const initializeRecording = useCallback((stream: MediaStream) => {
    logInfo('녹화 초기화 시작');
    
    // 이전 청크 데이터 초기화
    chunksRef.current = [];
    
    // 녹화 시작 시간 기록
    const now = Date.now();
    recordingStartTimeRef.current = now;
    lastTimeRef.current = now;
    forceEndTimeRef.current = now + (RECORDING_DURATION * 1000) + 500; // 0.5초 여유
    
    logInfo('녹화 시간 설정', {
      startTime: new Date(recordingStartTimeRef.current).toISOString(),
      plannedEndTime: new Date(forceEndTimeRef.current).toISOString(),
      duration: `${RECORDING_DURATION}초`
    });
    
    try {
      // MediaRecorder 인스턴스 생성
      const options = { mimeType: 'video/webm;codecs=vp9' };
      const mediaRecorder = new MediaRecorder(stream, options);
      recorderRef.current = mediaRecorder;
      
      logInfo('MediaRecorder 생성됨', {
        state: mediaRecorder.state,
        mimeType: mediaRecorder.mimeType
      });
      
      // 데이터 청크 수집
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          logInfo('데이터 청크 수집됨', { 
            chunkSize: (event.data.size / 1024).toFixed(2) + ' KB',
            totalChunks: chunksRef.current.length
          });
        }
      };
      
      // 녹화 완료 처리
      mediaRecorder.onstop = () => {
        logInfo('MediaRecorder onStop 이벤트 발생');
        
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        // 이미 녹화 중지로 설정되어 있을 수 있으므로 recordingComplete만 업데이트
        setState(prev => ({
          ...prev,
          recording: false,
          recordingComplete: true,
          videoBlob,
          elapsedTime: RECORDING_DURATION,
          remainingTime: 0
        }));
        
        logInfo('녹화 완료', { 
          blobSize: (videoBlob.size / (1024 * 1024)).toFixed(2) + ' MB',
          chunks: chunksRef.current.length,
          duration: RECORDING_DURATION
        });
      };
      
      // 녹화 시작
      mediaRecorder.start(1000); // 1초마다 데이터 수집
      
      logInfo('녹화 시작됨');
      
      setState(prev => ({
        ...prev,
        recording: true,
        recordingComplete: false,
        mediaRecorder,
        elapsedTime: 0,
        remainingTime: RECORDING_DURATION
      }));
      
      // 데이터 요청 간격 설정 (2초마다)
      const dataInterval = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
          logInfo('데이터 요청됨');
        } else {
          clearInterval(dataInterval);
          logInfo('데이터 요청 간격 종료됨');
        }
      }, 2000);
      
      // 녹화 타이머 시작 (정확한 시간 간격으로 카운트다운)
      timerIdRef.current = setInterval(() => {
        const currentTime = Date.now();
        const totalElapsed = Math.floor((currentTime - recordingStartTimeRef.current) / 1000);
        
        setState(prev => {
          // 이미 녹화가 중지된 경우 타이머 중지
          if (!prev.recording) {
            if (timerIdRef.current) {
              clearInterval(timerIdRef.current);
              timerIdRef.current = null;
            }
            return prev;
          }
          
          // 최대 녹화 시간에 도달했거나 초과했는지 확인
          if (totalElapsed >= RECORDING_DURATION && prev.recording) {
            logInfo(`${RECORDING_DURATION}초 도달, 녹화 중지 호출`);
            // setState 내부에서 직접 함수 호출은 피하고 플래그 설정
            setTimeout(() => stopRecording(), 0);
            return { 
              ...prev, 
              elapsedTime: RECORDING_DURATION,
              remainingTime: 0 
            };
          }
          
          // 남은 시간 계산
          const newRemainingTime = Math.max(0, RECORDING_DURATION - totalElapsed);
          
          return { 
            ...prev, 
            elapsedTime: totalElapsed,
            remainingTime: newRemainingTime
          };
        });
      }, 100); // 더 정확한 타이밍을 위해 더 짧은 간격으로 체크
      
      // 강제 종료 타이머 설정 (예상 종료 시간 + 0.5초)
      endTimerIdRef.current = setTimeout(() => {
        logWarning('강제 종료 타이머 실행됨');
        // 여전히 녹화 중인지 확인 후 중지
        setState(prev => {
          if (prev.recording) {
            logWarning(`${RECORDING_DURATION}초 이상 경과, 강제 종료`);
            // setState 내부에서 직접 함수 호출은 피하고 플래그 설정
            setTimeout(() => stopRecording(), 0);
          }
          return prev;
        });
      }, (RECORDING_DURATION * 1000) + 500);
      
    } catch (error) {
      logError('녹화 초기화 오류', error);
    }
  }, [stopRecording, state.recording]);
  
  // 카운트다운 시작 함수
  const startCountdown = useCallback((stream: MediaStream) => {
    logInfo('카운트다운 시작', { duration: COUNTDOWN_DURATION });
    setState(prev => ({ ...prev, countdown: COUNTDOWN_DURATION }));
    
    const startTime = Date.now();
    const countdownInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const currentCount = COUNTDOWN_DURATION - elapsed;
      
      logInfo('카운트다운 진행 중', { count: currentCount });
      
      setState(prev => {
        if (currentCount <= 0) {
          clearInterval(countdownInterval);
          logInfo('카운트다운 완료, 녹화 시작');
          // 카운트다운이 끝나면 녹화 시작
          initializeRecording(stream);
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: currentCount };
      });
    }, 100); // 더 정확한 타이밍을 위해 더 짧은 간격으로 체크
  }, [initializeRecording]);
  
  // 녹화 시작 함수 (카운트다운 시작)
  const startRecording = useCallback((stream: MediaStream) => {
    logInfo('녹화 시작 요청됨');
    startCountdown(stream);
  }, [startCountdown]);
  
  // 녹화 상태 리셋 함수
  const resetRecording = useCallback(() => {
    logInfo('녹화 상태 초기화');
    
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    
    if (endTimerIdRef.current) {
      clearTimeout(endTimerIdRef.current);
      endTimerIdRef.current = null;
    }
    
    setState({
      recording: false,
      recordingComplete: false,
      mediaRecorder: null,
      videoBlob: null,
      countdown: 0,
      elapsedTime: 0,
      remainingTime: RECORDING_DURATION
    });
    
    // Blob URL 해제
    if (state.videoBlob) {
      try {
        URL.revokeObjectURL(URL.createObjectURL(state.videoBlob));
        logInfo('Blob URL 해제됨');
      } catch (error) {
        logError('Blob URL 해제 오류', error);
      }
    }
  }, [state.videoBlob]);
  
  return {
    state,
    startRecording,
    stopRecording,
    resetRecording
  };
}; 