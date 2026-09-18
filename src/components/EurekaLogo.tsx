import { useId } from "react";
import type { CSSProperties, MouseEventHandler } from "react";

/** Render the supplied artwork, keeping its letterforms and aspect ratio.
 * The SVG viewport removes surrounding whitespace; an alpha mask removes the
 * paper background so the same original renders cleanly on light/dark surfaces.
 */
export default function EurekaLogo({ tone = "white", style, onClick }: {
  tone?: "white" | "black";
  style?: CSSProperties;
  onClick?: MouseEventHandler<SVGSVGElement>;
}) {
  const id = useId().replace(/:/g, "");
  return <svg className="eureka-logo" xmlns="http://www.w3.org/2000/svg" viewBox="76 131 1832 484" height="32" role="img" aria-label="Eureka!" onClick={onClick}
    style={{ display: "block", width: "auto", aspectRatio: "1832 / 484", flexShrink: 0, ...style }}>
    <title>Eureka!</title>
    <defs>
      <filter id={`${id}-ink`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.2126 -0.7152 -0.0722 0 1" />
        <feComponentTransfer><feFuncA type="linear" slope="1.05" intercept="-0.025" /></feComponentTransfer>
      </filter>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="76" y="131" width="1832" height="484" style={{ maskType: "alpha" }}>
        <image href="/brand/eureka-wordmark.png" width="2021" height="778" filter={`url(#${id}-ink)`} />
      </mask>
    </defs>
    <rect x="76" y="131" width="1832" height="484" fill={tone === "white" ? "#fff" : "#000"} mask={`url(#${id}-mask)`} />
  </svg>;
}
