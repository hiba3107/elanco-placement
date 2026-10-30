import { h } from "../dom.js";
import { formatNumber } from "../format.js";
import { showFieldMessages } from "./fieldMessages.js";
import { PhotoError, preparePhoto } from "./photo.js";

const photoInput = document.getElementById("report-photo");
const photoPreview = document.getElementById("report-photo-preview");

/**
 * The optional photo: prepares the chosen file for upload (see photo.js),
 * shows a preview with a way to remove it, and explains when a file cannot be
 * used. The report can always be sent without a photo.
 */
export function createPhotoField(rules) {
  let blob = null;
  let processing = null;

  function clear() {
    blob = null;
    photoInput.value = "";
    const preview = photoPreview.querySelector("img");
    if (preview) {
      URL.revokeObjectURL(preview.src);
    }
    photoPreview.replaceChildren();
    photoPreview.hidden = true;
  }

  function showPreview(fileName) {
    photoPreview.replaceChildren(
      h(
        "div",
        { class: "flex items-center gap-3" },
        h("img", {
          src: URL.createObjectURL(blob),
          alt: "Preview of the photo you chose",
          class: "h-20 w-20 rounded-lg border border-line object-cover",
        }),
        h(
          "div",
          { class: "text-sm" },
          h("p", { class: "font-medium text-ink" }, fileName),
          h(
            "p",
            { class: "text-ink-muted" },
            `Ready to send (${formatNumber(Math.round(blob.size / 1024))} KB)`,
          ),
          h("button", { type: "button", class: "text-link mt-1", onClick: clear }, "Remove photo"),
        ),
      ),
    );
    photoPreview.hidden = false;
  }

  function showProblem(error) {
    clear();
    const reason =
      error instanceof PhotoError
        ? error.message
        : "That photo couldn't be prepared for upload. Please try another one.";
    showFieldMessages("photo", {
      error: `${reason} You can also send the report without a photo.`,
    });
  }

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    showFieldMessages("photo", {});
    if (!file) {
      clear();
      return;
    }
    photoPreview.replaceChildren(
      h("p", { class: "text-sm text-ink-soft", role: "status" }, "Preparing your photo…"),
    );
    photoPreview.hidden = false;
    processing = preparePhoto(file, rules)
      .then((prepared) => {
        blob = prepared;
        showPreview(file.name);
      })
      .catch(showProblem)
      .finally(() => {
        processing = null;
      });
  });

  return {
    blob: () => blob,
    // Lets a submit wait for a photo that is still being prepared.
    whenReady: () => processing,
    clear,
  };
}
