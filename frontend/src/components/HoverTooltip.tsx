import { Show } from "solid-js";
import type { ReaderToken } from "./TokenSpan";

type HoverTooltipProps = {
  token: ReaderToken;
  x: number;
  y: number;
};

export default function HoverTooltip(props: HoverTooltipProps) {
  return (
    <Show when={props.token.translation}>
      {(translation) => (
        <div
          class="reader-tooltip"
          role="tooltip"
          style={{ left: `${props.x}px`, top: `${props.y}px` }}
        >
          {translation()}
        </div>
      )}
    </Show>
  );
}
