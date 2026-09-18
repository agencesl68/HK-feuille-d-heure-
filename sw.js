/* Page de verification des notifications — service worker Web Push.
   Sert uniquement aux envois de test vers le telephone de l'agence. */

self.addEventListener("install", function(){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function(event){
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch(e){ data = { body: event.data ? event.data.text() : "" }; }
  var titre = data.title || "Test";
  var options = {
    body: data.body || "Notification de test",
    icon: "/HK-Direction/icon.png",
    badge: "/HK-Direction/icon.png",
    tag: "hk-test",
    renotify: true,
    data: { url: data.url || "/HK-Direction/verif-notifications.html" }
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", function(event){
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/HK-Direction/verif-notifications.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list){
      for (var i = 0; i < list.length; i++){
        if (list[i].url.indexOf("/HK-Direction/") !== -1 && "focus" in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
