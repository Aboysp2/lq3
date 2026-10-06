"use strict";

const APP_CACHE = "labarkouh-quran-app-v2";
const AUDIO_CACHE = "labarkouh-quran-audio-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_FILES))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            return key !== APP_CACHE && key !== AUDIO_CACHE;
          })
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    عند تشغيل ملف MP3:
    1. البحث عنه أولًا في ذاكرة التلاوات المحفوظة.
    2. إن لم يكن محفوظًا، يتم طلبه من الإنترنت.
  */
  if (url.hostname.includes("mp3quran.net") && url.pathname.endsWith(".mp3")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
    );

    return;
  }

  /*
    ملفات التطبيق نفسها:
    نعيدها من الكاش أولًا، ثم نستخدم الإنترنت عندما لا تكون متاحة.
  */
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const copy = networkResponse.clone();

            caches.open(APP_CACHE).then((cache) => {
              cache.put(request, copy);
            });
          }

          return networkResponse;
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
