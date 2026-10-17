You can save this as:

```text
docs/PEDAGOGY.md
```

or

```text
docs/PRINCIPLES_AND_FOUNDATIONS.md
```

Below is the full Markdown file.

```md
---
title: Pedagogy and Methodological Foundations
status: living document
audience: developers, designers, AI assistants, language educators
scope: principles, pedagogy, methodology, learning design
---

# Pedagogy and Methodological Foundations

This document defines the educational principles and methodological foundations of the project.

It is not merely a theoretical statement. It should guide:

- product decisions,
- interface design,
- data modeling,
- AI prompt design,
- practice activities,
- content handling,
- learner feedback,
- architecture priorities.

The app is a language-learning reader, but its deeper purpose is to create **meaningful, humane, cognitively sound, and enjoyable conditions for language development**.

---

## 1. Core Educational Philosophy

The project is founded on the belief that language learning is not only memorization, but a process of:

- understanding meaningful messages,
- noticing patterns in context,
- connecting form to meaning,
- developing linguistic, pragmatic, and cultural sensitivity,
- gradually moving from supported comprehension to autonomous use,
- building a personal relationship with the target language.

The learner is not an empty container to be filled with vocabulary.

The learner is an active meaning-maker, a social being, an embodied cognitive agent, and a developing multilingual person.

Therefore, the app should not reduce language learning to:

- isolated word pairs,
- decontextualized grammar rules,
- addictive streak mechanics,
- meaningless repetition,
- artificial gamification,
- one-size-fits-all CEFR judgments.

Instead, the app should support:

- meaningful reading,
- contextual understanding,
- reflective noticing,
- gradual autonomy,
- personal relevance,
- cultural awareness,
- low-pressure practice,
- sustainable motivation.

---

## 2. Primary Methodological Stance

The project adopts a **principled eclectic methodology**.

This means it does not belong exclusively to one method, such as:

- Grammar-Translation,
- Audiolingualism,
- Communicative Language Teaching,
- Task-Based Language Teaching,
- Content-Based Instruction,
- TPR,
- Natural Approach,
- Focus on Form.

Instead, it draws from several approaches while maintaining clear principles.

The app should support:

| Dimension | Methodological orientation |
|---|---|
| Input | Comprehensible, meaningful, interest-driven |
| Attention | Noticing, focus on form, input enhancement |
| Meaning | Always primary |
| Grammar | Contextualized, contrastive, functional |
| Vocabulary | Lexeme-based, chunk-aware, semantically organized |
| Practice | Retrieval-based, spaced, varied |
| Production | Supported, purposeful, low-pressure |
| Culture | Situated, pragmatic, non-stereotyped |
| Learner role | Active, reflective, autonomous |
| Teacher role | Mediator, designer of conditions |
| AI role | Assistant, tutor, generator, not ultimate authority |

---

## 3. Guiding Principles

### 3.1 Meaning comes first

Language items should be encountered and practiced in meaningful contexts.

A word, chunk, or grammatical structure should not be treated as an isolated object unless there is a specific pedagogical reason.

The app should always ask:

> What does this mean here?
> Why is it used here?
> What would change if another form were used?
> How does this help the learner understand or express something real?

---

### 3.2 Comprehensible input is central

The app should help learners work with texts that are comprehensible but slightly challenging.

This follows the idea of **i + 1**: content should be close enough to the learner’s current level to be understandable, but rich enough to allow development.

The app should estimate:

- known-word coverage,
- unknown but learnable items,
- items that are too far beyond the learner’s current level,
- text difficulty,
- lexical density,
- grammatical complexity,
- pragmatic complexity.

The goal is not to make all texts easy.

The goal is to make difficulty visible and manageable.

---

### 3.3 Noticing is essential

Learning is supported when learners notice linguistic features in context.

The app should help learners notice:

- unknown words,
- partially known words,
- known words used in new ways,
- grammatical patterns,
- multi-word chunks,
- pragmatic markers,
- register shifts,
- metaphorical expressions,
- discourse markers,
- culturally significant forms.

Noticing does not mean forcing explicit explanation at all times.

It means directing attention in a way that makes input more learnable.

---

### 3.4 Form is important, but not isolated from meaning

The app supports **focus on form**, not only isolated focus on forms.

This means grammar, morphology, pronunciation, and pragmatics are addressed as they appear in meaningful language use.

The app should not treat grammar as a list of rules to be memorized before use.

Instead, it should help the learner understand:

- what the form is,
- what it means,
- when it is used,
- how it differs from the learner’s L1,
- what communicative function it serves,
- what would be lost or changed without it.

---

### 3.5 Scaffolding should be contingent and fade over time

Support should be provided when needed and withdrawn as competence grows.

The app should implement a scaffold ladder, for example:

1. full L1 translation and example,
2. L1 translation only,
3. target-language definition,
4. synonym or semantic hint,
5. first letter or partial cue,
6. cloze or contextual prompt,
7. independent use.

Scaffolding should not create permanent dependence.

The pedagogical aim is increasing autonomy.

---

### 3.6 The Zone of Proximal Development guides activity selection

Not everything is equally learnable at a given moment.

The app should distinguish between:

| Zone | Meaning | App behavior |
|---|---|---|
| Independent | Learner already knows it | Use for fluency, extensive reading, confidence |
| ZPD | Learnable now with support | Target for practice, explanation, scaffolding |
| Beyond | Too difficult for now | Defer, hide, or present passively |

The app should avoid overwhelming learners with too many items beyond their current developmental zone.

---

### 3.7 Learning is embodied, situated, enacted, and extended

Language is not only abstract symbolic processing.

The app is informed by **4E cognition**:

- **Embodied**: language connects to body, sensation, gesture, emotion, perception.
- **Embedded**: language occurs in physical and social environments.
- **Enacted**: language is action, not only representation.
- **Extended**: tools, notes, corpora, and annotations become part of cognition.

Therefore, the app should support:

- images,
- audio,
- gesture notes,
- sensory associations,
- situational metadata,
- realia,
- metaphors,
- personal corpus,
- external memory tools,
- task-based language use.

---

### 3.8 Language is social and pragmatic

Grammar alone is not enough.

Learners need to understand:

- who is speaking,
- to whom,
- in what context,
- with what power relationship,
- with what level of intimacy,
- through what channel,
- for what purpose,
- with what emotional tone,
- under what cultural expectations.

The app should support pragmatic awareness through:

- register notes,
- politeness notes,
- situational metadata,
- speech-act tags,
- appropriateness judgments,
- regional variation notes,
- formality sliders,
- discourse-marker explanations.

The app must avoid presenting one dialect, social class, region, or cultural norm as universally correct.

---

### 3.9 Culture should be treated carefully

Culture is not a list of stereotypes.

The app should present cultural and pragmatic information as:

- contextual,
- variable,
- probabilistic,
- regionally diverse,
- socially situated,
- historically influenced.

Preferred language:

> In many contexts...
> Some speakers may...
> This can be perceived as...
> In formal situations...
> Depending on the region...

Avoid:

> All native speakers...
> This is the only correct way...
> That culture is...
> Always/never...

---

### 3.10 The learner’s L1 is a resource, not only interference

The learner’s first language or reference language is not merely a source of error.

It is also:

- a cognitive reference point,
- a contrastive tool,
- a scaffold for early understanding,
- a source of metalinguistic awareness,
- part of the learner’s plurilingual competence.

The app should support:

- contrastive notes,
- false-friend alerts,
- calque detection,
- L1-influenced error tagging,
- translation as temporary scaffold,
- gradual reduction of L1 dependence.

The goal is not to eliminate the L1 immediately.

The goal is to develop flexible, context-appropriate access to the target language.

---

### 3.11 Vocabulary and grammar require different treatment

The app distinguishes between **lexical learning** and **grammatical learning**.

Vocabulary can often be learned through explicit encoding, retrieval practice, and spaced repetition.

Grammar is often better developed through:

- repeated exposure,
- noticing in context,
- structured input,
- form-meaning mapping,
- meaningful production,
- proceduralization.

Therefore, the app should not treat grammar simply as flashcards.

Grammar should be tracked through:

- exposure count,
- noticing events,
- contextual examples,
- structured input tasks,
- production attempts,
- error patterns,
- gradual proceduralization.

---

### 3.12 Repetition is necessary, but must be meaningful

Spaced repetition is valuable, but not sufficient.

The app supports SRS for:

- vocabulary,
- chunks,
- collocations,
- useful phrases,
- morphological forms,
- selected pragmatic expressions.

However, repetition should be embedded in a larger meaningful ecosystem:

```text
reading → noticing → understanding → saving → practicing → using → reflecting → reading again
```

The app should avoid meaningless repetition where the learner can answer correctly without processing meaning.

---

### 3.13 Retrieval practice is powerful

The app should favor active retrieval over passive review whenever appropriate.

Instead of only showing:

> word → translation

the app should also ask:

> What does this mean?
> What word fits this context?
> What form completes this idea?
> How would you say this?
> What is the opposite?
> What chunk usually goes with this?
> What register is this?
> What would a native likely say here?

Retrieval should be adjusted to the learner’s level and scaffold needs.

---

### 3.14 Depth of processing improves learning

The app should encourage deeper processing when saving or reviewing items.

Examples of deeper processing:

- choose a suitable translation,
- identify the lemma,
- identify grammatical function,
- produce an original sentence,
- identify collocations,
- compare with L1,
- identify register,
- attach an image,
- attach a personal association,
- classify by semantic field,
- explain pragmatics.

Not every item needs deep processing.

But important or repeated items should receive richer encoding.

---

### 3.15 Input enhancement should be subtle and useful

The app may visually enhance target features in texts:

- highlight grammar structures,
- underline chunks,
- color-code annotations,
- show morpheme boundaries,
- mark discourse markers,
- emphasize pragmatic expressions.

Enhancement should support attention without overwhelming the reading experience.

The learner should be able to turn enhancement on or off.

---

### 3.16 Learner affect matters

Anxiety, frustration, shame, and pressure can interfere with learning.

The app should support emotional safety.

This means:

- no harsh correction,
- no public failure,
- no guilt-based streak mechanics,
- no red-heavy error aesthetics,
- no forced speed unless explicitly chosen,
- no punitive messaging,
- no exaggeration of failure.

The app should include a **low-stakes mode**.

Low-stakes mode is not a luxury. It is pedagogically justified by affective factors in learning.

---

### 3.17 Motivation should be meaningful, not manipulative

The app should avoid dark patterns.

It should not rely mainly on:

- fear of losing streaks,
- artificial urgency,
- social pressure,
- addictive reward loops,
- exaggerated achievement badges.

Instead, motivation should come from:

- interesting content,
- visible progress,
- meaningful texts,
- personal corpus growth,
- increased comprehension,
- successful communication,
- aesthetic pleasure,
- curiosity,
- cultural discovery.

---

### 3.18 The learner should see their own growth

The app should function as a mirror of the learner’s developing language system.

It should show:

- known words,
- learning words,
- exposure counts,
- vocabulary growth,
- grammar exposure,
- error patterns,
- reading volume,
- text difficulty progression,
- personal examples,
- saved chunks,
- metaphors learned,
- pragmatic notes collected.

This supports metacognition and learner agency.

---

### 3.19 The app should support extensive and intensive reading

Both are necessary.

| Mode | Purpose | App support |
|---|---|---|
| Extensive reading | Fluency, enjoyment, volume, global comprehension | Easy texts, fewer interruptions, low lookup pressure |
| Intensive reading | Noticing, analysis, detailed understanding | Annotations, lookups, grammar notes, drills |

The app should not force every text into intensive study.

Some texts should be read mainly for meaning and enjoyment.

---

### 3.20 The app should support both accuracy and fluency

Accuracy and fluency are not enemies.

The app should provide:

- accuracy-oriented activities: cloze, form choice, morphological practice, contrastive tasks,
- fluency-oriented activities: easy reading, timed recognition, retelling, shadowing, extensive input.

The balance may change depending on learner goals.

---

## 4. Theoretical Foundations

This section summarizes the main theoretical influences.

These are not ornamental references. They inform concrete product features.

---

## 4.1 Comprehensible Input

The app assumes that learners benefit from language they can mostly understand, especially when it contains some learnable features just beyond their current level.

Practical implications:

- estimate known-word coverage,
- classify texts by difficulty,
- recommend texts in a suitable range,
- show comprehension forecasts,
- provide glosses when needed,
- allow graded simplification,
- support interest-driven input.

The app should not assume that incomprehensible input becomes useful merely because it is authentic.

Authenticity is valuable, but accessibility matters.

---

## 4.2 Noticing Hypothesis and Focus on Form

Learners benefit when their attention is drawn to linguistic features in context.

Practical implications:

- highlight unknown or partially known items,
- mark grammar points in real sentences,
- show chunks and collocations,
- reveal morphological structure,
- compare expected vs actual forms,
- prompt noticing without overloading.

The app should avoid turning every reading session into grammar analysis.

Noticing should be optional, contextual, and learner-controlled.

---

## 4.3 Zone of Proximal Development and Scaffolding

The app should identify what the learner can do independently, what they can do with support, and what is currently too difficult.

Practical implications:

- independent / ZPD / beyond classification,
- scaffold levels,
- hint ladders,
- fading support,
- dynamic difficulty,
- test-teach-retest possibilities,
- AI as mediator rather than answer machine.

The app should not always give the answer immediately.

Sometimes it should offer:

- a hint,
- a partial cue,
- a contextual clue,
- a simplified definition,
- a contrastive clue,
- a morphological clue.

---

## 4.4 4E Cognition

The app views cognition as:

### Embodied

Language connects to the body.

Features:

- images,
- gestures,
- audio,
- sensory notes,
- metaphor maps,
- body-based idioms,
- emotion-body language.

### Embedded

Language occurs in environments.

Features:

- setting tags,
- situational vocabulary,
- realia,
- environment-specific chunks.

### Enacted

Language is action.

Features:

- tasks,
- role-plays,
- requests,
- refusals,
- apologies,
- negotiations,
- goal-based dialogue.

### Extended

Cognition extends into tools.

Features:

- personal corpus,
- annotations,
- lexicon,
- notes,
- concept maps,
- export to external systems,
- searchable history.

---

## 4.5 Semantic Fields and Lexical Organization

Words are not isolated atoms. They belong to systems of meaning.

The app should support semantic organization:

- emotion words,
- motion verbs,
- food terms,
- household objects,
- academic vocabulary,
- speech-act verbs,
- discourse markers,
- evaluative language.

Practical implications:

- semantic field tags,
- field visualization,
- gap detection,
- related-word suggestions,
- category fluency tasks,
- scale or intensity ordering.

Caution:

Semantic clustering is useful for exploration and mapping, but drilling highly similar items together can sometimes cause interference. Therefore:

> Cluster for understanding; interleave for retention.

---

## 4.6 Lexemes, Wordforms, and Morphemes

The app should distinguish between:

| Unit | Example | Purpose |
|---|---|---|
| Token | “corrió” | actual occurrence in text |
| Wordform | “corrió” with features | inflected form |
| Lexeme | “correr” | abstract dictionary unit |
| Morpheme | “corr-”, “-ió” | smallest meaningful units |

Practical implications:

- track knowledge at the lexeme level,
- display wordform details,
- show paradigms,
- show derivational families,
- support morpheme decomposition where feasible,
- count exposure by lexeme,
- avoid misleading raw word counts.

This is especially important in morphologically rich languages.

---

## 4.7 Contrastive Grammar and L1 Influence

The learner’s L1 influences perception, production, interpretation, and pragmatics.

The app should support:

- false-friend alerts,
- calque detection,
- contrastive grammar notes,
- L1-influenced error tagging,
- cue-training tasks,
- form-function comparisons,
- translation as scaffold,
- pragmatic transfer awareness.

Contrastive work should be nuanced.

It should not claim that every L1 speaker will make the same error.

It should identify tendencies and possible interference points.

---

## 4.8 Social-Bio Linguistic Situations

Language use is shaped by both social and embodied factors.

The app should support situational metadata:

### Social factors

- participants,
- relationship,
- power,
- intimacy,
- genre,
- purpose,
- channel,
- formality,
- norms,
- taboos.

### Bio-embodied factors

- emotion,
- arousal,
- fatigue,
- urgency,
- body language,
- prosody,
- physical setting,
- sensory state.

Practical implications:

- situation cards,
- register sliders,
- appropriateness ratings,
- pragmatic notes,
- role-play variables,
- affect tagging.

---

## 4.9 CEFR and Can-Do Orientation

The CEFR is useful as a descriptive framework and shared vocabulary.

However, it should not be treated as a rigid truth or a certified judgment inside the app.

The app may use CEFR for:

- rough text difficulty estimation,
- word-level tagging when data exists,
- can-do goal setting,
- learner self-assessment,
- mediation tasks,
- plurilingual competence awareness.

The app should always mark CEFR outputs as estimates.

Preferred phrasing:

> Estimated level: B1
> Provisional estimate
> Rough CEFR mapping

Avoid:

> This text is definitely B1.
> You are certified B2.
> This word is objectively A2.

---

## 4.10 Psycholinguistics

The app should respect well-supported psycholinguistic principles.

### Frequency

High-frequency items should generally receive priority.

### Exposure

Repeated encounters are essential.

The app should count and display exposures.

### Retrieval

Active recall strengthens memory more than passive review.

### Spacing

Distributed practice is superior to massed practice.

### Depth of processing

Meaningful engagement improves retention.

### Generation effect

Producing language can be more powerful than only recognizing it.

### Interleaving

Varied practice can improve discrimination and long-term learning.

### Automaticity

Fluency requires fast, effortless processing.

The app may later include speeded tasks, but speed should be optional and purposeful.

---

## 4.11 Cognitive Functions and L2 Acquisition

Language learning involves multiple cognitive systems.

The app recognizes the distinction between:

- declarative knowledge,
- procedural knowledge,
- explicit awareness,
- implicit sensitivity,
- working memory limits,
- attentional resources,
- inhibitory control,
- cognitive flexibility.

Practical implications:

- vocabulary may be explicitly taught and reviewed,
- grammar may require exposure and procedural practice,
- tasks should respect working memory limits,
- complex sentences may need chunking,
- practice should vary between accuracy and fluency,
- learners should be able to reflect on whether they “know the rule” or “feel the pattern.”

---

## 4.12 Neurobiological Bases

The app should respect well-supported findings without falling into neuromyths.

Useful principles:

- spacing supports consolidation,
- sleep matters,
- stress can impair learning,
- emotional relevance can enhance memory,
- retrieval strengthens memory,
- multimodal encoding can help,
- attention is limited.

The app should avoid:

- learning styles myths,
- left-brain/right-brain myths,
- “we only use 10% of the brain” claims,
- exaggerated brain-based marketing,
- deterministic critical-period claims for adult learners.

Neuroscience should inform humility, not hype.

---

## 5. Methodological Consequences for the App

The principles above translate into concrete design consequences.

---

## 5.1 Two learning tracks

The app should distinguish:

### Lexical track

For:

- words,
- chunks,
- collocations,
- idioms,
- fixed expressions.

Methods:

- explicit meaning,
- retrieval practice,
- spaced repetition,
- semantic mapping,
- personal examples.

### Grammatical track

For:

- morphosyntax,
- word order,
- agreement,
- aspect,
- case,
- definiteness,
- modality,
- negation,
- pragmatically conditioned syntax.

Methods:

- exposure tracking,
- input enhancement,
- structured input,
- contextual explanation,
- contrastive notes,
- production tasks,
- noticing tasks.

Grammar may have cards, but it should not be reduced to cards.

---

## 5.2 Three-zone content filter

The app should classify language items and texts into:

```text
Independent
ZPD
Beyond
```

This affects:

- what is practiced,
- what is glossed,
- what is hidden,
- what is recommended,
- what is deferred.

---

## 5.3 Scaffold ladder

The app should support fading support.

Example:

```text
Level 6: full L1 translation + example
Level 5: L1 translation only
Level 4: target-language definition
Level 3: synonym/hint
Level 2: first letter/partial cue
Level 1: cloze/context cue
Level 0: independent use
```

The scaffold level should be stored, adjustable, and reviewable.

---

## 5.4 Exposure before mastery

The app should track exposure even before an item is “known.”

A word encountered once is not learned.

A word encountered across multiple contexts becomes a candidate for learning.

Exposure data helps distinguish:

- never seen,
- seen once,
- seen repeatedly but not saved,
- saved but not practiced,
- practiced but unstable,
- stable and known.

---

## 5.5 Error typology

Errors are valuable data.

The app may classify errors as:

| Error type | Meaning |
|---|---|
| Transfer | L1 influence |
| Developmental | Natural L2 developmental stage |
| Slip | Learner knows it but made a performance error |
| Pragmatic | Grammatically possible but socially inappropriate |
| Morphological | Wrong inflection or derivation |
| Lexical | Wrong word choice |
| Syntactic | Wrong structure |
| Orthographic | Spelling/form issue |

This helps the learner understand patterns rather than only see isolated mistakes.

---

## 5.6 Meaningful practice types

The app should support a variety of practice types.

Examples:

### Lexical practice

- cloze deletion,
- meaning recall,
- form recall,
- translation,
- semantic sorting,
- odd-one-out,
- scale ordering,
- collocation matching.

### Grammatical practice

- structured input,
- sentence reordering,
- form choice in context,
- transformation tasks,
- minimal-pair comparison,
- grammar noticing,
- pattern completion.

### Pragmatic practice

- register transformation,
- appropriateness judgment,
- speech-act response,
- politeness adjustment,
- situational judgment.

### Meaningful production

- retelling,
- summarizing,
- responding to text,
- journaling,
- mediation,
- paraphrase,
- personalization.

### Embodied/listening practice

- shadowing,
- dictation,
- TTS listening,
- pronunciation recording,
- minimal-pair discrimination.

Not all of these need to exist in the MVP.

But the architecture should allow them later.

---

## 6. The Learning Loop

The app should support a recurring learning loop:

```text
1. Choose meaningful content
   ↓
2. Read/listen with appropriate support
   ↓
3. Notice words, chunks, structures, or pragmatic features
   ↓
4. Understand meaning in context
   ↓
5. Save or annotate what is relevant
   ↓
6. Practice in the ZPD
   ↓
7. Review with fading support
   ↓
8. Use or produce language meaningfully
   ↓
9. Reflect on progress and patterns
   ↓
10. Return to richer input
```

This loop should feel natural, not mechanical.

---

## 7. Role of Local AI

Local AI is a mediator, not an oracle.

The app may use local AI for:

- contextual translations,
- target-language definitions,
- example generation,
- grammar explanations,
- pragmatic notes,
- contrastive notes,
- register variation,
- concept map extraction,
- CEFR difficulty estimation,
- mediation feedback,
- metaphor explanation,
- personalized drill generation.

However, AI output must be:

- validated,
- cached when appropriate,
- marked for uncertainty,
- reversible,
- editable by the learner,
- subordinate to dictionary/NLP data when stable facts are available.

The app should not present AI output as native-speaker authority.

Preferred stance:

> The AI is a helpful tutor, not a certified examiner, not a cultural spokesperson, and not the final source of truth.

---

## 8. Pedagogical Constraints for AI Prompts

All AI prompts should respect these constraints.

### AI should

- be accurate,
- be concise,
- be supportive,
- mark uncertainty,
- respect the learner’s level,
- use the target language when appropriate,
- explain variation carefully,
- produce structured output when requested,
- focus on the current context.

### AI should not

- invent translations,
- invent grammar rules,
- shame the learner,
- overcorrect,
- use stereotypes,
- claim universal native-speaker norms,
- present CEFR estimates as certified judgments,
- request personal data,
- produce unnecessarily long lectures,
- output invalid JSON when JSON is required.

---

## 9. Pedagogical Do/Don’t Table

| Do | Don’t |
|---|---|
| Prioritize meaning | Reduce language to isolated items |
| Use context | Present decontextualized rules as primary |
| Support noticing | Overload the learner with analysis |
| Provide scaffolding | Create permanent dependence |
| Fade support | Keep support forever |
| Track exposure | Assume one encounter equals learning |
| Use spaced repetition | Make SRS the only method |
| Support grammar in context | Turn grammar into meaningless flashcards |
| Respect learner L1 | Treat L1 as only interference |
| Encourage learner agency | Make the app controlling |
| Keep pressure low | Use guilt-based streak mechanics |
| Show variation | Present one dialect as universal |
| Treat culture carefully | Use stereotypes |
| Validate AI output | Trust AI blindly |
| Support enjoyment | Optimize only for efficiency |

---

## 10. Learner Experience Principles

The app should feel:

- calm,
- clear,
- respectful,
- curious,
- personal,
- non-punitive,
- intellectually serious,
- aesthetically pleasant.

The interface should avoid:

- visual noise,
- excessive badges,
- aggressive red errors,
- forced speed,
- unnecessary competition,
- misleading progress metrics.

The learner should feel:

> I am exploring a language, not being processed by a system.

---

## 11. Inclusion and Variation

The app should respect linguistic diversity.

This includes:

- regional variation,
- social variation,
- dialects,
- registers,
- minority varieties where relevant,
- plurilingual repertoires,
- different learning goals,
- different affective needs.

The app should not assume:

- one correct accent,
- one correct culture,
- one correct learning path,
- one correct pace,
- one correct form of participation.

---

## 12. Assessment Philosophy

The app is not a certified examiner.

It may provide:

- formative feedback,
- estimates,
- progress visualizations,
- error patterns,
- can-do reflections,
- self-assessment prompts.

It should not provide:

- official certification,
- high-stakes judgments,
- deterministic predictions,
- rigid labels.

Assessment should serve learning, not ranking.

---

## 13. Ethical Principles

The app should respect:

- learner privacy,
- learner autonomy,
- linguistic dignity,
- cultural complexity,
- emotional safety,
- data ownership.

The learner’s texts, annotations, errors, and personal examples belong to the learner.

The app should make data export and deletion possible.

---

## 14. Summary of Pedagogical Foundations

The project is grounded in the following principles:

1. Meaningful input is central.
2. Noticing supports acquisition.
3. Grammar should be connected to meaning and use.
4. Vocabulary and grammar require different learning tracks.
5. Scaffolding should be contingent and fade.
6. The ZPD guides what to practice.
7. The learner’s L1 is a resource and a reference point.
8. Language is embodied, situated, social, and extended.
9. Pragmatics and culture matter.
10. Repetition is necessary but must remain meaningful.
11. Retrieval, spacing, and depth of processing support memory.
12. Affect and motivation matter.
13. CEFR is useful but provisional.
14. AI is a mediator, not an authority.
15. The learner should develop autonomy and enjoyment.

---

## 15. Practical Motto

The app should help the learner move through language in this spirit:

```text
Read what matters.
Notice what happens.
Understand in context.
Practice with support.
Repeat with meaning.
Use with purpose.
Reflect with curiosity.
Grow without shame.
```

16. Key Theoretical References & Lineage
When instructing AI coding assistants or designing specific features, it helps to know the origin of these concepts. This prevents the AI from hallucinating generic "edtech" advice and forces it to respect established SLA (Second Language Acquisition) research.
Concept
	
Key Theorists / Origins
	
App Application
Comprehensible Input (i+1)
	
Stephen Krashen (1985)
	
Text difficulty estimation, known-word coverage metrics.
Noticing Hypothesis
	
Richard Schmidt (1990)
	
Input enhancement, highlighting, "noticing-the-gap" alerts.
Zone of Proximal Development (ZPD)
	
Lev Vygotsky (1978)
	
The 3-zone filter (Independent / ZPD / Beyond).
Scaffolding & Fading
	
Wood, Bruner, & Ross (1976)
	
The 7-level scaffold ladder, contingent hints.
Output Hypothesis
	
Merrill Swain (1985)
	
Retelling tasks, mediation, guided journaling.
Declarative/Procedural Model
	
Michael Ullman (2001)
	
The Two-Track system (Lexical SRS vs. Grammatical Exposure).
Competition Model
	
Bates & MacWhinney (1987)
	
Cue-training tasks, L1 interference alerts.
Processing Instruction / Structured Input
	
Bill VanPatten (1996)
	
Grammar noticing tasks, input enhancement.
Depth of Processing
	
Craik & Lockhart (1972)
	
Encoding ladder when saving words (translation -> image -> personal sentence).
Desirable Difficulties (Spacing/Interleaving)
	
Bjork, Cepeda, Roediger
	
SRS algorithms, interleaved practice queues.
4E Cognition
	
Clark, Chalmers, Chemero
	
Metaphor atlas, grounding bundles, extended personal corpus.
Sociocultural / Situated Learning
	
Lave & Wenger, Hymes
	
Situation cards, register sliders, pragmatic tagging.
17. Glossary of Core Terms (For AI & Developers)
Include this section so that when you ask your AI assistant to "build a lexeme tracker," it knows exactly what you mean mathematically and linguistically.

    Token: A specific occurrence of a word in a text (e.g., the word "ran" in sentence 4).
    Wordform: The specific inflected shape of a word (e.g., "ran", "running", "runs").
    Lexeme: The abstract dictionary unit or root (e.g., "RUN"). Mastery is tracked at the lexeme level.
    Morpheme: The smallest unit of meaning (e.g., "run" + "-ning").
    Lemma: The canonical dictionary form of a word (e.g., "run").
    Chunk / Collocation: Multi-word units that function as a single semantic block (e.g., "pay attention", "by the way").
    ZPD (Zone of Proximal Development): The band of language items a learner can understand only with scaffolding.
    Interleaving: Mixing different types of practice items (e.g., nouns, verbs, grammar) in a single drill session to improve discrimination, rather than blocking them by category.
    Input Enhancement: Subtly altering the visual presentation of text (bolding, color) to draw attention to a specific grammatical or lexical feature without interrupting reading.
    Mediation: Taking a concept from one context/language and explaining or adapting it for another audience (a core CEFR Companion Volume skill).
    Pragmatics: The study of how context, social relations, and intent affect language use (e.g., knowing when to use a formal vs. informal greeting).

18. Translating Pedagogy into UI/UX Rules
This section bridges the gap between theory and the SolidJS frontend. If a UI design violates these rules, it violates the pedagogy.
18.1. The "No Shame" UI Rule

    Theory: Affective Filter (Krashen) / Neurobiology of stress.
    UI Rule: Never use aggressive red colors for errors. Never use language like "Wrong!", "Failed!", or "You lost your streak!". 
    Implementation: Use neutral colors (e.g., soft orange or grey) for incorrect answers. Use phrases like "Let's review this again" or "Not quite, here is a hint."

18.2. The "Lexeme Grouping" Rule

    Theory: Morphological awareness / Ullman's Declarative memory.
    UI Rule: The user's "Known Word Count" must count Lexemes, not Tokens or Wordforms. 
    Implementation: If the user knows "hablar", "hablo", and "hablé", the UI shows "1 Lexeme mastered (3 forms encountered)".

18.3. The "Context First" Rule

    Theory: Depth of Processing / Situated Cognition.
    UI Rule: A word should never be presented for practice without its original sentence context available.
    Implementation: Every flashcard or cloze drill must have a "Show Context" button that reveals the exact sentence from the user's imported text where they first highlighted it.

18.4. The "Grammar is Not a Flashcard" Rule

    Theory: Procedural memory / VanPatten's Structured Input.
    UI Rule: Do not put abstract grammar rules on SRS flashcards (e.g., Front: "Subjunctive trigger", Back: "Es importante que...").
    Implementation: Grammar is practiced via Input Enhancement (highlighting the structure in a new text) and Structured Input tasks (e.g., "Who is doing the action in this sentence?").

18.5. The "Fading Scaffold" Rule

    Theory: Vygotsky / Wood & Bruner.
    UI Rule: The app must not give the full L1 translation immediately if the user has already demonstrated partial knowledge.
    Implementation: When a user clicks a word in the ZPD, the popup first shows the target-language definition or a synonym. The L1 translation is hidden behind a "Reveal Translation" toggle or requires a second click.