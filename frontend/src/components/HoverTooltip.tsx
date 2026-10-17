import type { ReaderToken } from "./TokenSpan";

type HoverTooltipProps = {
  token: ReaderToken;
  x: number;
  y: number;
};

export default function HoverTooltip(props: HoverTooltipProps) {
  return (
    <div
      class="reader-tooltip"
      role="tooltip"
      style={{ left: `${props.x}px`, top: `${props.y}px` }}
    >
      <strong>{props.token.surface}</strong>
      <span>{props.token.translation ?? "Click to inspect"}</span>
    </div>
  );
}
