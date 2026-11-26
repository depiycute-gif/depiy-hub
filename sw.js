/* De_piy Hub 서비스 워커
 * - 앱 설치(PWA)와 "오프라인이에요" 안내용이에요. 글·DM 같은 데이터는 캐시하지 않아요.
 * - 화면(HTML)은 항상 네트워크를 먼저 시도해서, 새 버전을 올리면 바로 반영돼요.
 * - 캐시 이름(VERSION)을 바꾸면 예전 캐시는 자동으로 지워져요. */
const VERSION = 'depiy-v17';
const CORE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const offlinePage = () => new Response(
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<body style="margin:0;font-family:sans-serif;background:#0b0b10;color:#eee;display:grid;place-items:center;height:100vh;text-align:center">' +
  '<div><div style="font-size:48px">📡</div><h2>오프라인이에요</h2><p style="color:#aaa">인터넷에 연결한 뒤 다시 열어 주세요.</p></div>',
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
);

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Supabase·CDN 등 외부 요청은 그대로 통과

  if (req.mode === 'navigate') {                           // 화면: 네트워크 우선, 실패하면 마지막으로 본 화면
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return res; })
        .catch(() => caches.match('./').then(hit => hit || offlinePage()))
    );
    return;
  }
  event.respondWith(                                       // 아이콘 등: 캐시 우선
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
