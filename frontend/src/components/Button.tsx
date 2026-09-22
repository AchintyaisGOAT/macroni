import type { ButtonHTMLAttributes } from "react";
import { buttonStyle, type ButtonVariant } from "../styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fontSize?: number;
}

/** The app's one button component - primary (gradient CTA), ghost (muted
 * secondary action), or danger (bare text action like "Remove"). Replaces
 * the same style object that was independently re-typed in 10+ files. */
export function Button({ variant = "primary", fontSize, style, ...rest }: ButtonProps) {
  return <button style={{ ...buttonStyle(variant, { fontSize }), ...style }} {...rest} />;
}
