import { A, useLocation } from "@solidjs/router";
import {
  createEffect,
  createResource,
  createSignal,
  Show,
} from "solid-js";
import "../App.css";
import AppShell from "../components/AppShell";

type PracticeCard = {
  id: number;
  item_type: "word" | "chunk";
  vocab_item_id: number | null;
  saved_chunk_id: number | null;
  card_type: "cloze";
  sentence: string;
  answer: string;
  hint: string | null;
};

type PracticeReview = {
  card_id: number;
  vocab_item_id: number | null;
  saved_chunk_id: number | null;
  mastery: number;
};

function isPracticeCard(value: unknown): value is PracticeCard {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value && typeof value.id === "number" &&
    "vocab_item_id" in value && (typeof value.vocab_item_id === "number" || value.vocab_item_id === null) &&
    "saved_chunk_id" in value && (typeof value.saved_chunk_id === "number" || value.saved_chunk_id === null) &&
    "item_type" in value && (value.item_type === "word" || value.item_type === "chunk") &&
    ((value.item_type === "word" && typeof value.vocab_item_id === "number") ||
      (value.item_type === "chunk" && typeof value.saved_chunk_id === "number")) &&
    "card_type" in value && value.card_type === "cloze" &&
    "sentence" in value && typeof value.sentence === "string" &&
    "answer" in value && typeof value.answer === "string" &&
    "hint" in value && (typeof value.hint === "string" || value.hint === null)
  );
}

function isPracticeCardList(value: unknown): value is PracticeCard[] {
  return Array.isArray(value) && value.every(isPracticeCard);
}

function isPracticeReview(value: unknown): value is PracticeReview {
  if (typeof value !== "object" || value === null) return false;
  return (
    "card_id" in value && typeof value.card_id === "number" &&
    "vocab_item_id" in value && (typeof value.vocab_item_id === "number" || value.vocab_item_id === null) &&
    "saved_chunk_id" in value && (typeof value.saved_chunk_id === "number" || value.saved_chunk_id === null) &&
    ((typeof value.vocab_item_id === "number" && value.saved_chunk_id === null) ||
      (typeof value.saved_chunk_id === "number" && value.vocab_item_id === null)) &&
    "mastery" in value && typeof value.mastery === "number"
  );
}

function getErrorMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("detail" in value)) return null;
  return typeof value.detail === "string" ? value.detail : null;
}

export default function Practice() {
  const location = useLocation();

  const [practiceCards, setPracticeCards] = createSignal<PracticeCard[]>([]);
  const [practiceLoading, setPracticeLoading] = createSignal(false);
  const [practiceError, setPracticeError] = createSignal<string | null>(null);
  const [practiceIndex, setPracticeIndex] = createSignal(0);
  const [practiceAnswer, setPracticeAnswer] = createSignal("");
  const [practiceChecked, setPracticeChecked] = createSignal(false);
  const [practiceSubmitting, setPracticeSubmitting] = createSignal(false);
  const [practiceCorrect, setPracticeCorrect] = createSignal(0);
  const [practiceReviewed, setPracticeReviewed] = createSignal(0);
  const [practiceAnswerCorrect, setPracticeAnswerCorrect] = createSignal(false);
  const [practiceReviewError, setPracticeReviewError] = createSignal<string | null>(null);
  const [showAnswer, setShowAnswer] = createSignal(false);

  const loadPracticeSession = async () => {
    setPracticeLoading(true);
    setPracticeError(null);
    setPracticeReviewError(null);
    setPracticeCards([]);
    setPracticeIndex(0);
    setPracticeAnswer("");
    setPracticeChecked(false);
    setPracticeCorrect(0);
    setPracticeReviewed(0);
    setShowAnswer(false);
    try {
      const response = await fetch("/api/practice/session");
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to load practice cards.");
      }
      if (!isPracticeCardList(body)) {
        throw new Error("The backend returned an unexpected practice session.");
      }
      setPracticeCards(body);
    } catch (requestError) {
      setPracticeError(
        requestError instanceof Error ? requestError.message : "Unable to load practice cards.",
      );
    } finally {
      setPracticeLoading(false);
    }
  };

  // Sync with URL / load on mount
  createEffect(() => {
    if (location.pathname === "/practice") {
      void loadPracticeSession();
    }
  });

  const checkPracticeAnswer = async () => {
    const card = practiceCards()[practiceIndex()];
    const answerGiven = practiceAnswer().trim();
    if (!card || !answerGiven || practiceSubmitting() || practiceChecked()) return;

    const correct =
      answerGiven.toLocaleLowerCase() === card.answer.trim().toLocaleLowerCase();
    setPracticeSubmitting(true);
    setPracticeReviewError(null);
    try {
      const response = await fetch("/api/practice/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          ...(card.item_type === "word" ? { vocab_item_id: card.vocab_item_id } : { saved_chunk_id: card.saved_chunk_id }),
          correct,
          answer_given: answerGiven,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body) ?? "Unable to record this review.");
      }
      if (!isPracticeReview(body)) {
        throw new Error("The backend returned an unexpected review response.");
      }
      setPracticeAnswerCorrect(correct);
      setPracticeChecked(true);
      setPracticeReviewed((count) => count + 1);
      if (correct) setPracticeCorrect((count) => count + 1);
    } catch (requestError) {
      setPracticeReviewError(
        requestError instanceof Error ? requestError.message : "Unable to record this review.",
      );
    } finally {
      setPracticeSubmitting(false);
    }
  };

  const nextPracticeCard = () => {
    setPracticeIndex((index) => index + 1);
    setPracticeAnswer("");
    setPracticeChecked(false);
    setPracticeReviewError(null);
    setShowAnswer(false);
  };

  const skipCard = () => {
    setShowAnswer(true);
  };

  let skipCounter = 0;

  return (
    <AppShell>
      <main class="practice-page-main">
        <section>
          <h2>Cloze practice</h2>
          <p>Recall a saved word or chunk in the sentence where you encountered it.</p>

          <Show when={practiceLoading()}>
            <p>Preparing a short practice session…</p>
          </Show>
          <Show when={practiceError()}>
            <p role="alert">{practiceError()}</p>
          </Show>
          <Show when={!practiceLoading() && !practiceError()}>
            <Show
              when={practiceCards().length > 0}
              fallback={<p>No learning words or chunks with sentence context yet. Save one from the Reader to practice it here.</p>}
            >
              <Show
                when={practiceIndex() < practiceCards().length}
                fallback={
                  <div role="status">
                    <h3>Session complete</h3>
                    <p>You answered {practiceCorrect()} of {practiceReviewed()} correctly.</p>
                    <p>
                      {practiceCorrect() === practiceReviewed()
                        ? "Nice work recalling each word in context."
                        : "Good practice. These words will be ready to revisit."}
                    </p>
                    <button type="button" onClick={() => void loadPracticeSession()}>Practice again</button>
                  </div>
                }
              >
                <div class="practice-card">
                  <p class="practice-progress">
                    {practiceCards()[practiceIndex()]?.item_type === "chunk" ? "Chunk" : "Word"}{" "}
                    · Card {practiceIndex() + 1} of {practiceCards().length}
                  </p>
                  <p class="cloze-sentence">{practiceCards()[practiceIndex()]?.sentence}</p>
                  <Show when={practiceCards()[practiceIndex()]?.hint}>
                    <p class="practice-hint">Hint: {practiceCards()[practiceIndex()]?.hint}</p>
                  </Show>

                  <form onSubmit={(event) => { event.preventDefault(); void checkPracticeAnswer(); }}>
                    <label for="practice-answer">Your answer</label>
                    <input
                      id="practice-answer"
                      type="text"
                      value={practiceAnswer()}
                      onInput={(event) => setPracticeAnswer(event.currentTarget.value)}
                      disabled={practiceSubmitting()}
                      autocomplete="off"
                      required
                    />
                    <Show
                      when={!practiceChecked()}
                      fallback={
                        <div class="practice-feedback" role="status">
                          <p>
                            {practiceAnswerCorrect()
                              ? "Correct — you recalled the word in context."
                              : "Not quite, but this is useful practice."}
                          </p>
                          <p>Answer: <strong>{practiceCards()[practiceIndex()]?.answer}</strong></p>
                          <button type="button" onClick={nextPracticeCard}>Next</button>
                        </div>
                      }
                    >
                      <div class="practice-action-row">
                        <button type="submit" disabled={!practiceAnswer().trim() || practiceSubmitting()}>
                          {practiceSubmitting() ? "Checking…" : "Check"}
                        </button>
                        <Show when={showAnswer()}>
                          <span class="practice-answer-reveal">
                            {practiceCards()[practiceIndex()]?.answer}
                          </span>
                        </Show>
                        <button type="button" onClick={skipCard}>Skip / Show Answer</button>
                      </div>
                    </Show>
                  </form>

                  <Show when={practiceReviewError()}>
                    <p class="practice-feedback" role="alert">{practiceReviewError()}</p>
                  </Show>
                </div>
              </Show>
            </Show>
          </Show>
        </section>
      </main>
      <footer>
        <p>Lector — Local-first language learning</p>
      </footer>
    </AppShell>
  );
}
