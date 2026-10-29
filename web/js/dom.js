// Builds page elements from plain values. Text always goes in as text, never
// as HTML, so data from the API (such as a report's notes) can never inject
// markup or scripts into the page.

function isRenderable(child) {
  return child !== null && child !== undefined && child !== false;
}

export function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (!isRenderable(value)) {
      continue;
    }
    if (name.startsWith("on") && typeof value === "function") {
      element.addEventListener(name.slice(2).toLowerCase(), value);
    } else if (name === "class") {
      element.className = value;
    } else {
      element.setAttribute(name, value === true ? "" : String(value));
    }
  }
  element.append(...children.flat(Infinity).filter(isRenderable));
  return element;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ICON_PATHS = {
  warning: "M12 3 2 21h20L12 3Zm0 6v5m0 3.5v.5",
  search: "M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm4.8 11.3L20 20",
  info: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 8v5m0-8.5V8",
  check: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm-4 9 3 3 5-6",
  external: "M14 4h6v6m0-6L11 13M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
};

export function icon(name, className = "h-5 w-5") {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", ICON_PATHS[name]);
  svg.append(path);
  return svg;
}
