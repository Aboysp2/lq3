const CACHE_APP = "labarkouh-quran-app-v1";
const CACHE_AUDIO = "labarkouh-quran-audio";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_APP).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_APP && key !== CACHE_AUDIO)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  // ملفات التلاوات: من الكاش أولًا، ثم الإنترنت
  if (request.url.includes("mp3quran.net") && request.url.endsWith(".mp3")) {
    event.respondWith(
      caches.open(CACHE_AUDIO).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch (error) {
          return new Response("", { status: 504, statusText: "Offline" });
        }
      })
    );
    return;
  }

  // ملفات التطبيق: كاش أولًا مع تحديث بالخلفية
  event.respondWith(
    caches.open(CACHE_APP).then(async cache => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
