import { Navigate, Route, Router } from "@solidjs/router";
import Library from "./pages/Library";
import Reader from "./pages/Reader";
import Workspace from "./Workspace";

export default function App() {
  return (
    <Router>
      <Route path="/" component={() => <Navigate href="/library" />} />
      <Route path="/library" component={Library} />
      <Route path="/read/:textId" component={Reader} />
      <Route path="/lexicon" component={Workspace} />
      <Route path="/practice" component={Workspace} />
      <Route path="*" component={() => <Navigate href="/library" />} />
    </Router>
  );
}
