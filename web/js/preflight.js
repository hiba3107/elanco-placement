// A plain script that runs before the app. Opened straight from disk, a page's
// module scripts are blocked by the browser, so without this the page would
// just sit there blank with no explanation.
if (window.location.protocol === "file:") {
  document.addEventListener("DOMContentLoaded", () => {
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.style.cssText =
      "margin:1rem;padding:1rem;border-radius:0.5rem;background:#fef1f0;color:#b42318;font:600 1rem system-ui,sans-serif";
    message.textContent =
      "This page needs the Tick Tracker server. In a terminal, run npm start in the project folder, then open http://localhost:3000.";
    document.body.prepend(message);
  });
}
