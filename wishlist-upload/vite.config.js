import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import parseHandler from './api/parse.js';
import imageHandler from './api/image.js';

// 개발 서버에서도 /api/* 가 배포 환경과 똑같이 동작하게 한다
const devApi = {
  name: 'dev-api',
  configureServer(server) {
    for (const [path, handler] of [
      ['/api/parse', parseHandler],
      ['/api/image', imageHandler],
    ]) {
      server.middlewares.use(path, (req, res) => {
        req.url = path + req.url;
        handler(req, res);
      });
    }
  },
};

export default defineConfig({
  plugins: [react(), devApi],
  // 누끼 라이브러리는 WASM·워커를 직접 불러오므로 미리 묶지 않는다
  optimizeDeps: { exclude: ['@imgly/background-removal'] },
});
