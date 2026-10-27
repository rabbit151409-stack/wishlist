// 상품 사진 누끼 따기: 브라우저 안에서 AI 모델로 배경을 지운다.
// 처음 한 번은 모델(수십 MB)을 내려받아 시간이 걸리고, 그 뒤로는 브라우저에 캐시된다.

const MAX_SIDE = 512;

// 쇼핑몰 이미지는 서버 함수를 거쳐 받는다(CORS). data: 주소는 그대로 쓴다
async function loadBlob(src) {
  const url = src.startsWith('data:') ? src : `/api/image?url=${encodeURIComponent(src)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('이미지를 받지 못했어요');
  return res.blob();
}

// 투명한 가장자리를 잘라내 상품만 남긴다(진열대 위에 딱 붙어 서도록). 옅은 그림자(알파 96 이하)는 상품으로 치지 않는다
function trimBox(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 96) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// 가장자리를 잘라내고 긴 변 512px로 줄여 저장 공간을 아낀다
async function shrink(blob) {
  const bitmap = await createImageBitmap(blob);
  const full = document.createElement('canvas');
  full.width = bitmap.width;
  full.height = bitmap.height;
  const fctx = full.getContext('2d');
  fctx.drawImage(bitmap, 0, 0);
  const box = trimBox(fctx, full.width, full.height);
  const scale = Math.min(1, MAX_SIDE / Math.max(box.w, box.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(box.w * scale);
  canvas.height = Math.round(box.h * scale);
  canvas.getContext('2d').drawImage(full, box.x, box.y, box.w, box.h, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', 0.85);
  // webp 인코딩을 못 하는 브라우저(iOS 구버전)는 png로 돌려준다
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
}

export async function removeBackground(src, onProgress) {
  const [{ removeBackground: run }, input] = await Promise.all([
    import('@imgly/background-removal'),
    loadBlob(src),
  ]);
  const result = await run(input, {
    output: { format: 'image/png' },
    progress: (key, current, total) => {
      if (onProgress && key.startsWith('fetch')) onProgress(total ? current / total : 0);
    },
  });
  return shrink(result);
}

// 직접 고른 사진: 긴 변 1024px JPEG로 줄여 data: 주소로 만든다
export async function photoToDataUrl(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
}
