// Service Worker for Web Push Notifications — BLACK SHEEP

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "BLACK SHEEP";
  const options = {
    body: data.body || "",
    icon: data.icon || "/newsletter/bs-logo.svg",
    badge: "/newsletter/favicons/logo/icon-192.png",
    data: { url: data.url || "/newsletter" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/newsletter";
  event.waitUntil(self.clients.openWindow(url));
});
