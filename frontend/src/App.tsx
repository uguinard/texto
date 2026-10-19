import { Navigate, Route, Router } from "@solidjs/router";
import Library from "./pages/Library";
import Reader from "./pages/Reader";
import Lexicon from "./pages/Lexicon";
import Practice from "./pages/Practice";

export default function App() {
  return (
    <Router>
      <Route path="/" component={() => <Navigate href="/library" />} />
      <Route path="/library" component={Library} />
      <Route path="/read/:textId" component={Reader} />
      <Route path="/lexicon" component={Lexicon} />
      <Route path="/practice" component={Practice} />
      <Route path="*" component={() => <Navigate href="/library" />} />
    </Router>
  );
}
