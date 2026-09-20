/**
 * 文件名称：sw.js（Service Worker）
 * 文件作用：
 *     把应用外壳（index.html、manifest、图标）缓存到本地，
 *     使手机把网页"添加到主屏幕"后可以离线打开、快速启动。
 *
 * 设计原则：
 *   1. 只缓存同源 GET 请求，不碰任何外部资源；
 *   2. 缓存优先、后台更新：命中缓存直接返回，同时尝试联网更新；
 *   3. 断网且无缓存时退回到 index.html，避免出现浏览器错误页；
 *   4. 版本号变化时自动清理旧缓存。
 */

const CACHE_NAME = "drug-quiz-v2.1.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

/* 安装：预缓存应用外壳 */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

/* 激活：清理旧版本缓存 */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key === CACHE_NAME ? null : caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* 请求拦截：同源 GET 走"缓存优先 + 后台更新" */
self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (cached) {
      const network = fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); }).catch(function () {});
        }
        return response;
      }).catch(function () {
        /* 断网：有缓存用缓存，没有则回到首页 */
        return cached || caches.match("./index.html");
      });
      return cached || network;
    })
  );
});
