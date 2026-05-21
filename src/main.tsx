import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';

// QueryClient 인스턴스 생성 (불필요한 윈도우 포커스 리페치 방지 및 재시도 제한 설정)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// 개발 모드에서만 MSW 모킹 서비스 워커를 비동기로 시작하는 함수
async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // 서비스 워커 시작 및 처리되지 않은 다른 리소스 요청(예: .svg)은 콘솔 경고 없이 통과(bypass)하도록 설정
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

// MSW 활성화가 완료된 시점 이후에 React App을 마운트하여 첫 요청 레이스 컨디션 방지
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
});
