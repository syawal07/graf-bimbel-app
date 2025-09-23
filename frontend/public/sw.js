self.addEventListener("push", function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/assets/img/hero/10.jpg", // Ganti dengan path logo kecil Anda
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
