/* HK Terrassement — service worker notifications (Web Push VAPID standard, sans SDK tiers) */

self.addEventListener("install", function(){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function(event){
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch(e){ data = { body: event.data ? event.data.text() : "" }; }

  // Titre vide volontairement : iOS affiche déjà le nom de l'app.
  // Un titre ferait doublon ("HK Terrassement" + "from HK Terrassement").
  var titre = (typeof data.title === "string") ? data.title : "";
  var options = {
    body: data.body || "N'oublie pas de remplir ta feuille d'heures",
    icon: "/HK-feuille-d-heure-/icon.png",
    badge: "/HK-feuille-d-heure-/icon.png",
    tag: "hk-rappel",
    renotify: true,
    data: { url: data.url || "/HK-feuille-d-heure-/" }
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", function(event){
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/HK-feuille-d-heure-/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list){
      for (var i = 0; i < list.length; i++){
        if (list[i].url.indexOf("/HK-feuille-d-heure-/") !== -1 && "focus" in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
