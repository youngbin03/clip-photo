import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// 디버깅 활성화
const DEBUG = true;

// Firebase 디버그 로그 함수
const logDebug = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`%c[Firebase] ${message}`, 'color: #039BE5; font-weight: bold');
    if (data) {
      console.log(data);
    }
  }
};

// Firebase 오류 로그 함수
const logError = (message: string, error: any) => {
  console.error(`%c[Firebase Error] ${message}`, 'color: #FF5252; font-weight: bold');
  console.error(error);
  
  // 자세한 오류 정보 출력
  if (error && error.code) {
    console.error(`Error Code: ${error.code}`);
  }
  if (error && error.message) {
    console.error(`Error Message: ${error.message}`);
  }
  if (error && error.serverResponse) {
    console.error(`Server Response:`, error.serverResponse);
  }
};

// Firebase 설정
// 여기에 Firebase 프로젝트 설정을 입력하세요
const firebaseConfig = {
    apiKey: "AIzaSyDLNteroLxDRLU6Q6cqDYPLXsTLvn3rtVo",
    authDomain: "clip-avatar.firebaseapp.com",
    databaseURL: "https://clip-avatar-default-rtdb.firebaseio.com",
    projectId: "clip-avatar",
    storageBucket: "clip-avatar.firebasestorage.app",
    messagingSenderId: "972885904094",
    appId: "1:972885904094:web:ade7264d0ba3982543904f",
    measurementId: "G-40K3KMKMSD"
  };

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// CORS 문제 해결 가이드
/* 
Firebase Storage CORS 설정 방법:
1. Firebase 콘솔(https://console.firebase.google.com)에 접속
2. 프로젝트 선택 > Storage 메뉴로 이동
3. "규칙" 탭에서 다음 규칙으로 업데이트:

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}

4. "CORS 구성" 만들기: 
   Firebase CLI를 설치하고 다음 명령어 실행:
   $ firebase init storage
   $ cd storage
   $ vi cors.json
   
   cors.json 파일에 다음 내용 추가:
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT", "DELETE"],
       "maxAgeSeconds": 3600
     }
   ]
   
   $ firebase deploy --only storage
*/

// 비디오 업로드 함수 (CORS 오류 발생 시 로컬 저장 백업)
export const uploadVideo = async (videoBlob: Blob, frameId: string): Promise<string> => {
  try {
    // 로컬 URL 생성 (Firebase 업로드 실패 시 백업)
    const localUrl = URL.createObjectURL(videoBlob);
    logDebug("로컬 URL 생성 완료", { localUrl });
    logDebug("Blob 정보", { 
      size: `${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB`, 
      type: videoBlob.type,
      lastModified: new Date()
    });
    
    try {
      // 타임스탬프
      const timestamp = new Date().getTime();
      const fileName = `videos/${frameId}_${timestamp}.webm`;
      logDebug("업로드 파일 이름 생성", { fileName });
      
      // Storage 참조 생성
      logDebug("Storage 참조 생성 시작", { 
        storageBucket: firebaseConfig.storageBucket,
        path: fileName
      });
      const storageRef = ref(storage, fileName);
      logDebug("Storage 참조 생성 완료", { fullPath: storageRef.fullPath });
      
      // 업로드 메타데이터
      const metadata = {
        contentType: 'video/webm',
        customMetadata: {
          'frameId': frameId,
          'timestamp': timestamp.toString(),
          'uploadedFrom': window.location.origin,
          'forMobile': 'true' // 모바일 호환성 표시
        },
        // 다운로드 기능 활성화를 위한 헤더 추가
        contentDisposition: `attachment; filename="photobooth_video_${timestamp}.webm"`
      };
      logDebug("업로드 메타데이터 설정", metadata);
      
      // Firebase에 업로드 시도
      logDebug("Firebase Storage 업로드 시작");
      const uploadResult = await uploadBytes(storageRef, videoBlob, metadata);
      logDebug("Firebase Storage 업로드 완료", { 
        ref: uploadResult.ref.fullPath,
        metadata: uploadResult.metadata
      });
      
      // 업로드 성공 시 다운로드 URL 가져오기
      logDebug("다운로드 URL 요청 시작");
      const downloadURL = await getDownloadURL(storageRef);
      logDebug("다운로드 URL 획득 완료", { downloadURL });
      
      // Firestore에 정보 저장
      logDebug("Firestore 데이터 저장 시작");
      const docData = {
        url: downloadURL,
        frameId,
        timestamp: Timestamp.now(),
        fileName,
        localUrl,
        metadata: {
          contentType: 'video/webm',
          size: videoBlob.size,
          uploadedAt: new Date().toISOString()
        }
      };
      
      const docRef = await addDoc(collection(db, "videos"), docData);
      logDebug("Firestore 데이터 저장 완료", { documentId: docRef.id });
      
      return downloadURL;
    } catch (error) {
      logError('Firebase 업로드 오류 (CORS 문제 가능성)', error);
      console.log('로컬 URL로 대체합니다.');
      
      // 네트워크 상태 확인
      logDebug("네트워크 상태 확인", {
        online: navigator.onLine,
        connection: (navigator as any).connection ? 
          (navigator as any).connection.effectiveType : 'unknown'
      });
      
      // Firebase 업로드 실패 시 로컬 URL 반환 및 Firestore에 로컬 정보만 저장
      try {
        const docRef = await addDoc(collection(db, "videos"), {
          localUrl,
          frameId,
          timestamp: Timestamp.now(),
          isLocalOnly: true,
          error: (error as Error).message || 'Unknown error'
        });
        logDebug("로컬 정보만 Firestore에 저장 완료", { documentId: docRef.id });
      } catch (firestoreError) {
        logError("Firestore 저장 실패", firestoreError);
      }
      
      return localUrl;
    }
  } catch (error) {
    logError('업로드 전체 오류', error);
    throw error;
  }
};

// 안전한 URL 생성 (CORS 회피)
export const getProxiedUrl = (originalUrl: string): string => {
  // URL이 로컬 Blob URL인지 확인
  if (originalUrl.startsWith('blob:')) {
    logDebug("로컬 Blob URL 사용", { originalUrl });
    return originalUrl; // 로컬 URL은 그대로 반환
  }
  
  // Firebase URL인 경우 CORS 프록시 서버 사용
  logDebug("Firebase Storage URL 사용", { originalUrl });
  return originalUrl;
};

// Firebase 상태 확인 함수 (외부에서 호출 가능)
export const checkFirebaseStatus = () => {
  try {
    const status = {
      initialized: !!app && !!db && !!storage,
      config: {
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket
      },
      time: new Date().toISOString()
    };
    
    logDebug("Firebase 상태 확인", status);
    return status;
  } catch (error) {
    logError("Firebase 상태 확인 실패", error);
    return { initialized: false, error: (error as Error).message };
  }
};

export { db, storage }; 