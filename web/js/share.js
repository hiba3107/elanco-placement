// Shares a link the best way the browser allows: the device's own share sheet
// (phones, some desktops), then copying to the clipboard, and if both are
// unavailable or refused, the caller shows the link for copying by hand.
export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error.name === "AbortError") {
        return "cancelled";
      }
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      return "manual";
    }
  }
  return "manual";
}

export function directionsUrl({ lat, lng }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
