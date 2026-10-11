# Random Question Subset

SupaQuiz lets a quiz serve a **random subset** of its question pool on each attempt.
For example, an owner can build a quiz with 360 questions and configure it so every
participant answers 100 randomly selected questions — a different set each time.

## Why use it

- Keep a large question bank while limiting quiz length.
- Reduce answer sharing: every participant (and every retake) gets a different mix.
- Reuse one bank for multiple difficulty or topic mixes over time.

## Setting it up (quiz owner)

1. Open a quiz in the admin dashboard — either **Create New Quiz** or **Edit Quiz**.
2. Go to the **Settings** tab.
3. Find **Questions per Attempt** (next to *Max Participants*).
4. Enter the number of questions each attempt should serve, e.g. `100`.
   - **Leave it empty** to serve every question in the pool (default).
   - A value equal to or larger than the pool size behaves the same as empty —
     all questions are served.
5. Save (or Publish). The setting applies to every new attempt from that point on.

The question pool can hold up to **500 questions** per quiz.

## How it behaves for participants

- When a participant starts the quiz, SupaQuiz randomly selects the configured
  number of questions and freezes that set for the whole session.
- The quiz start page shows the number of questions they will actually answer,
  plus a note that questions are randomly selected from the pool.
- Scores are out of the subset size — e.g. answering a 100-question subset shows
  "X out of 100", never out of the full pool.
- The results answer-review shows only the questions that were served.
- Each new attempt draws a **fresh random subset**.

## Interaction with other settings

| Setting                     | Effect                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| **Shuffle Questions off**   | The sampled questions appear in their original pool order.                                      |
| **Shuffle Questions on**    | The sampled questions additionally appear in random order.                                      |
| **Max Attempts**            | Each retake draws a new subset, so retakers see different questions.                            |
| **Preview mode**            | Admin previews use the same random selection, so owners see what participants will get.         |
| **Import / Export**         | The setting is included in exported quiz JSON and restored on import.                            |
| **Duplicate Quiz**          | Copies the subset setting along with all questions.                                              |
| **Questions deleted later** | If the pool shrinks below the configured value, attempts simply serve the whole remaining pool. |

## Notes

- The subset is chosen **per attempt at start time** — it stays fixed while the
  participant answers, so page refreshes don't reshuffle it.
- Adding or editing questions in the pool only affects attempts started after
  the change.
