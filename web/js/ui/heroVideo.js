// The opening video plays by itself, silently and on a loop. Anything that
// moves on its own for more than five seconds needs a way to stop it
// (WCAG 2.2.2), so the button pauses and restarts it.
export function initHeroVideo(video, toggle) {
  function showPlaying(playing) {
    toggle.textContent = playing ? "Pause video" : "Play video";
  }

  video.addEventListener("play", () => showPlaying(true));
  video.addEventListener("pause", () => showPlaying(false));

  toggle.addEventListener("click", () => {
    if (video.paused) {
      video.muted = true;
      video.play().catch(() => showPlaying(false));
    } else {
      video.pause();
    }
  });

  showPlaying(!video.paused);
}
