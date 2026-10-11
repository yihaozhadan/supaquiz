# Question Groups

SupaQuiz lets a quiz organize its question pool into **groups** (sections) —
for example *Geography*, *Science*, and *History* — and optionally serve a
**random pick** from each group on every attempt.

## Why use it

- Structure a large pool into topics while keeping one quiz.
- Sample a fixed number of questions from each section, so every attempt
  covers the same spread of topics with different questions.
- Combine per-group picks with the global **Questions per Attempt** setting
  for fine-grained control over quiz length.

## Setting it up (quiz owner)

1. Open a quiz in the admin dashboard (**Create New Quiz** or **Edit Quiz**).
2. Go to the **Questions** tab.
3. Scroll to the **Groups** panel:
   - Enter a **name** (e.g. `Geography`).
   - Optionally set **Pick** — the number of questions to randomly serve
     from the group per attempt. Leave empty (or `0`) to serve **every
     question** in the group.
   - Click **Add Group**.
4. Assign questions to groups:
   - **Drag and drop** a question onto a group in the question tree, or
     drop it at the top / bottom to move it out of a group.
   - Or use the **Group** dropdown when creating or editing a question.
5. Edit a group's name or pick count, or delete it with the icons on the
   group header. Deleting a group only **ungroups** its questions — the
   questions themselves are never deleted.

A quiz can hold up to **250 groups** (half the 500-question pool cap).

## How questions are selected per attempt

- **Ungrouped questions always serve.**
- Each group contributes `pick` random questions — or all of them when the
  pick count is unset or not smaller than the group size.
- The global **Questions per Attempt** cap (see
  [Random Question Subset](RandomQuestionSubset.md)) applies **after**
  per-group sampling, capping the combined pool.
- The served questions keep their pool order unless **Shuffle Questions**
  is enabled, which additionally randomizes the order.

## How it behaves for participants

- The quiz start page shows the number of questions they will actually
  answer (accounting for group picks and the global subset).
- The served set is frozen for the whole session, so page refreshes don't
  reshuffle it.
- Each new attempt draws a fresh random pick from each group.

## Interaction with other settings

| Setting                     | Effect                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| **Shuffle Questions off**   | Sampled questions appear in their original pool order.                                           |
| **Shuffle Questions on**    | Sampled questions additionally appear in random order.                                           |
| **Questions per Attempt**   | Caps the combined pool of ungrouped questions and group samples.                                 |
| **Preview mode**          | Admin previews use the same selection, so owners see what participants will get.                 |
| **Import / Export**         | Groups are exported with the quiz (questions reference groups by name); restored on import.        |
| **Duplicate Quiz**          | Copies all groups, their pick counts, and group assignments.                                     |
| **Questions deleted later** | If a group shrinks below its pick count, the whole group is served.                              |

## Notes

- Group membership and order are saved together when you reorder questions.
- Group names are unique per quiz; on import, a question referencing an
  unknown group name becomes ungrouped (with a warning).
- Adding, editing, or regrouping questions only affects attempts started
  after the change.
