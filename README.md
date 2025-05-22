# 축제 포토부스 웹 앱

React와 TypeScript, Tailwind CSS를 사용하여 구현한 축제용 포토부스 웹 애플리케이션입니다.

## 기능

- 웹캠을 통한 실시간 화면 표시
- 다양한 프레임 테마 선택 가능
- 선택한 프레임에 따라 배경 애니메이션 변경

## 프로젝트 실행 방법

1. 의존성 패키지 설치:
```
npm install
```

2. 개발 서버 시작:
```
npm start
```

3. 빌드:
```
npm run build
```

## 에셋 추가 방법

1. 프레임 선택 버튼 이미지:
   - `public/assets/tags/` 폴더에 `choice-1.png`, `choice-2.png`, `choice-3.png` 파일을 추가합니다.

2. 프레임 배경 영상:
   - `public/assets/frames/` 폴더에 `choice-1.mp4`, `choice-2.mp4`, `choice-3.mp4` 파일을 추가합니다.

## 사용 기술

- React
- TypeScript
- Tailwind CSS
- react-webcam

## 참고 사항

- 이 앱은 1920x1080 해상도에 최적화되어 있습니다.
- 웹캠 접근 권한이 필요합니다.
- 모던 브라우저(Chrome, Firefox, Edge 등)에서 실행해주세요.

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
