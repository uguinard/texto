import { A, useLocation } from "@solidjs/router";
import type { JSX } from "solid-js";

type AppShellProps = {
  children: JSX.Element;
  fullScreen?: boolean;
};

export default function AppShell(props: AppShellProps) {
  const location = useLocation();
  const isReader = () => location.pathname.startsWith("/read/");

  return (
    <div class={`app-shell${props.fullScreen ? " app-shell--reader" : ""}`}>
      <header class="app-topbar">
        <div class="app-brand">
          <h1>Lector</h1>
          <p>Personal Language-Learning Reader</p>
        </div>
        <nav class="app-navigation" aria-label="Main navigation">
          <A
            href="/library"
            class={location.pathname === "/library" ? "app-navigation__active" : ""}
            aria-current={location.pathname === "/library" ? "page" : undefined}
          >
            Library
          </A>
          <A
            href="/library"
            class={isReader() ? "app-navigation__active" : ""}
            aria-current={isReader() ? "page" : undefined}
          >
            Reader
          </A>
          <A
            href="/lexicon"
            class={location.pathname === "/lexicon" ? "app-navigation__active" : ""}
            aria-current={location.pathname === "/lexicon" ? "page" : undefined}
          >
            Lexicon
          </A>
          <A
            href="/practice"
            class={location.pathname === "/practice" ? "app-navigation__active" : ""}
            aria-current={location.pathname === "/practice" ? "page" : undefined}
          >
            Practice
          </A>
        </nav>
      </header>
      <main class="app-main">{props.children}</main>
    </div>
  );
}
