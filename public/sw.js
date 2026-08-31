const CACHE_NAME = "vapor-entregas-static-v4";
const PUBLIC_SHELL = [
  "/",
  "/form",
  "/termos",
  "/privacidade",
  "/manifest.webmanifest",
  "/icons/vapor-entregas-192.png",
  "/icons/vapor-entregas-512.png",
  "/icons/vapor-entregas-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

function isPrivatePath(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/cadastro")
  );
}

function mayStore(response) {
  const cacheControl = response.headers.get("cache-control") || "";
  return (
    response.ok &&
    !/private|no-store/i.test(cacheControl) &&
    !response.headers.has("set-cookie")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname))
    return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    ["style", "script", "font", "image"].includes(request.destination);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(request);
        if (mayStore(response)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  if (PUBLIC_SHELL.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (mayStore(response)) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Vapor Entregas",
      message: "Você recebeu uma atualização.",
    };
  }
  const title = String(payload.title || "Vapor Entregas").slice(0, 120);
  const body = String(payload.message || "Você recebeu uma atualização.").slice(
    0,
    500,
  );
  const path =
    typeof payload.path === "string" && payload.path.startsWith("/")
      ? payload.path
      : "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/vapor-entregas-192.png",
      badge: "/icons/vapor-entregas-192.png",
      data: { path },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path || "/";
  event.waitUntil(self.clients.openWindow(path));
});
