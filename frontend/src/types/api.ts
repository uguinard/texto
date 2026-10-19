/**
 * API Type Definitions
 * 
 * These TypeScript interfaces strictly mirror the backend Pydantic schemas
 * defined in `backend/app/schemas.py`. They form the API contract between
 * the FastAPI backend and the SolidJS frontend.
 * 
 * When modifying backend schemas, update the corresponding interface here.
 * Backend schema references are included in JSDoc comments for maintainability.
 */

/**
 * Core Text entity
 * @see backend/app/schemas.py -> Text
 * @see backend/app/models.py -> Text
 */
export interface Text {
  /** Unique identifier */
  id: number;
  /** Text title */
  title: string;
  /** Full text content */
  content: string;
  /** Creation timestamp (ISO 8601) */
  created_at: string; // ISO 8601 datetime string
}

/**
 * Core LexiconItem entity for spaced repetition tracking
 * @see backend/app/schemas.py -> LexiconItem
 * @see backend/app/models.py -> VocabItem (with Lexeme join)
 */
export interface LexiconItem {
  /** Unique identifier */
  id: number;
  /** Word surface form */
  surface: string;
  /** Lemma/base form */
  lemma: string | null;
  /** Translation/meaning */
  translation: string | null;
  /** Current learning state */
  state: "new" | "learning" | "known";
  /** Next review date for spaced repetition (ISO 8601) */
  next_review_date: string | null; // ISO 8601 datetime string
}

/**
 * Word lookup context returned by the lookup endpoint
 * @see backend/app/schemas.py -> WordContext
 * @see backend/app/services/lookup.py -> mock_lookup
 */
export interface WordContext {
  /** The word being looked up */
  word: string;
  /** Source sentence containing the word */
  sentence: string;
  /** Definition/explanation */
  definition: string | null;
  /** Translation */
  translation: string | null;
  /** Confidence level of the lookup */
  confidence: "high" | "medium" | "low";
}

// =============================================================================
// Existing Request/Response Types (mirroring backend/schemas.py)
// =============================================================================

/**
 * Request to import a new text
 * @see backend/app/schemas.py -> TextImportRequest
 */
export interface TextImportRequest {
  title: string;
  language: string;
  raw_text: string;
}

/**
 * Response after importing a text
 * @see backend/app/schemas.py -> TextImportResponse
 */
export interface TextImportResponse {
  id: number;
  sentence_count: number;
  approximate_token_count: number;
}

/**
 * Text list item for library view
 * @see backend/app/schemas.py -> TextListItem
 */
export interface TextListItem {
  id: number;
  title: string;
  language: string;
  created_at: string; // ISO 8601
  sentence_count: number;
  token_count: number;
}

/**
 * Rendered token for reader view
 * @see backend/app/schemas.py -> RenderedToken
 */
export interface RenderedToken {
  id: number;
  surface: string;
  lemma: string | null;
  pos: string | null;
  translation: string | null;
  sentence_id: number;
  order_index: number;
  whitespace_after: string;
  state: "new" | "learning" | "known";
}

/**
 * Rendered sentence for reader view
 * @see backend/app/schemas.py -> RenderedSentence
 */
export interface RenderedSentence {
  id: number;
  position: number;
  paragraph_index: number;
  content: string;
  tokens: RenderedToken[];
}

/**
 * Full text render response
 * @see backend/app/schemas.py -> TextRenderResponse
 */
export interface TextRenderResponse {
  text_id: number;
  title: string;
  language: string;
  created_at: string; // ISO 8601
  sentence_count: number;
  token_count: number;
  sentences: RenderedSentence[];
}

/**
 * Annotation category enum
 * @see backend/app/schemas.py -> AnnotationCategory
 */
export type AnnotationCategory = "lexical" | "syntactic" | "pragmatic" | "metaphor" | "discourse";

/**
 * Request to create an annotation
 * @see backend/app/schemas.py -> AnnotationCreateRequest
 */
export interface AnnotationCreateRequest {
  text_id: number;
  sentence_id: number;
  start_token_id: number;
  end_token_id: number;
  category: AnnotationCategory;
  note: string | null;
}

/**
 * Annotation response
 * @see backend/app/schemas.py -> AnnotationResponse
 */
export interface AnnotationResponse {
  id: number;
  text_id: number;
  sentence_id: number;
  start_token_id: number;
  end_token_id: number;
  category: AnnotationCategory;
  note: string | null;
  created_at: string; // ISO 8601
}

/**
 * Request to save a vocabulary item
 * @see backend/app/schemas.py -> VocabSaveRequest
 */
export interface VocabSaveRequest {
  text_id: number;
  token_id: number;
  lemma: string | null;
  translation: string | null;
}

/**
 * Vocabulary item response
 * @see backend/app/schemas.py -> VocabItemResponse
 */
export interface VocabItemResponse {
  id: number;
  surface: string;
  lemma: string | null;
  language: string;
  translation: string | null;
  state: "new" | "learning" | "known";
}

/**
 * Lexicon state update request
 * @see backend/app/schemas.py -> LexiconStateUpdate
 */
export interface LexiconStateUpdate {
  state: "new" | "learning" | "known";
}

/**
 * Practice card response
 * @see backend/app/schemas.py -> PracticeCardResponse
 */
export interface PracticeCardResponse {
  id: number;
  item_type: "word" | "chunk";
  vocab_item_id: number | null;
  saved_chunk_id: number | null;
  card_type: "cloze";
  sentence: string;
  answer: string;
  hint: string | null;
}

/**
 * Practice review request
 * @see backend/app/schemas.py -> PracticeReviewRequest
 */
export interface PracticeReviewRequest {
  card_id: number;
  vocab_item_id: number | null;
  saved_chunk_id: number | null;
  correct: boolean;
  answer_given: string;
}

/**
 * Practice review response
 * @see backend/app/schemas.py -> PracticeReviewResponse
 */
export interface PracticeReviewResponse {
  card_id: number;
  vocab_item_id: number | null;
  saved_chunk_id: number | null;
  mastery: number;
}

/**
 * Saved chunk create request
 * @see backend/app/schemas.py -> SavedChunkCreateRequest
 */
export interface SavedChunkCreateRequest {
  text_id: number;
  sentence_id: number;
  start_token_id: number;
  end_token_id: number;
  note: string | null;
}

/**
 * Saved chunk update request
 * @see backend/app/schemas.py -> SavedChunkUpdateRequest
 */
export interface SavedChunkUpdateRequest {
  state: "new" | "learning" | "known" | null;
  note: string | null;
}

/**
 * Saved chunk response
 * @see backend/app/schemas.py -> SavedChunkResponse
 */
export interface SavedChunkResponse {
  id: number;
  text_id: number;
  text_title: string;
  language: string;
  sentence_id: number;
  start_token_id: number;
  end_token_id: number;
  phrase: string;
  source_sentence: string;
  note: string | null;
  state: "new" | "learning" | "known";
  created_at: string; // ISO 8601
  next_review: string | null; // ISO 8601
}

/**
 * Lookup request
 * @see backend/app/schemas.py -> LookupRequest
 */
export interface LookupRequest {
  text_id: number;
  token_id: number;
  surface: string;
  sentence: string;
  language: string;
}

/**
 * Lookup response
 * @see backend/app/schemas.py -> LookupResponse
 */
export interface LookupResponse {
  surface: string;
  lemma: string | null;
  translation: string | null;
  target_definition: string | null;
  example: string | null;
  grammar_note: string | null;
  pragmatics_note: string | null;
  confidence: "high" | "medium" | "low";
  uncertain: boolean;
}