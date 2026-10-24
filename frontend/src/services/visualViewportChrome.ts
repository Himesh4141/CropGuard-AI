/** Keep UI chrome within the *visible* Android viewport when WebView is
 * magnified. This only adjusts the fixed navigation and settings backdrop;
 * content/text zoom remains available for accessibility. */
export function trackVisualViewportChrome(
  element: HTMLElement,
  kind: "navigation" | "settings",
): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  const original = element.style.cssText;
  let frame = 0;

  const update = () => {
    frame = 0;
    const scale = viewport.scale;
    if (!Number.isFinite(scale) || scale <= 1.01) {
      element.style.cssText = original;
      return;
    }

    // All coordinates are expressed in layout-viewport CSS pixels.
    // The inverse transform makes the chrome the same visual size at any zoom.
    const inverse = 1 / scale;
    const left = viewport.offsetLeft;
    const top = viewport.offsetTop;
    element.style.cssText = original;
    element.style.position = "fixed";
    element.style.right = "auto";
    element.style.bottom = "auto";
    element.style.maxWidth = "none";
    element.style.transformOrigin = "top left";
    element.style.transform = `scale(${inverse})`;
    if (kind === "navigation") {
      const gutter = 8;
      const height = 72;
      element.style.left = `${left + gutter * inverse}px`;
      element.style.top = `${top + viewport.height - (height + gutter) * inverse}px`;
      element.style.width = `${Math.max(0, viewport.width * scale - 2 * gutter)}px`;
      element.style.height = `${height}px`;
    } else {
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.width = `${viewport.width * scale}px`;
      element.style.height = `${viewport.height * scale}px`;
      element.style.setProperty("--cg-settings-visible-height", `${viewport.height * scale}px`);
    }
  };
  const schedule = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  update();
  viewport.addEventListener("resize", schedule);
  viewport.addEventListener("scroll", schedule);
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  return () => {
    viewport.removeEventListener("resize", schedule);
    viewport.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("orientationchange", schedule);
    if (frame) cancelAnimationFrame(frame);
    element.style.cssText = original;
  };
}
