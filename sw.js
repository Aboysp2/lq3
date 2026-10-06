"use strict";

const APP_CACHE = "labarkouh-quran-app-v1";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_ASSETS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    ملفات MP3 يتم التعامل معها من الصفحة نفسها عند الضغط على حفظ:
    caches.open("labarkouh-quran-audio-v1").put(...)
    لذلك هنا نُرجع نسخة الكاش أولًا إن كانت محفوظة.
  */
  if (url.hostname.includes("mp3quran.net") && url.pathname.endsWith(".mp3")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request);
      })
    );

    return;
  }

  /*
    التطبيق: كاش أولًا، ثم الإنترنت إذا لم تكن الملفات موجودة.
  */
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const responseCopy = response.clone();

            caches.open(APP_CACHE).then((cache) => {
              cache.put(request, responseCopy);
            });
          }

          return response;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return new Response("غير متاح بدون إنترنت", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});
