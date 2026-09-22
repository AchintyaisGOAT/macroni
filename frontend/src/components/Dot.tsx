import { dotStyle } from "../styles";

/** Small colored status dot - severity, connection status, legend swatch.
 * Previously reimplemented at inconsistent sizes (6/7/8px) across 6 files. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span aria-hidden style={dotStyle(color, size)} />;
}
