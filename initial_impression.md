# Step 2: Initial Impression and Researcher Positionality

**Text:** Ruskin Bond, "The Eyes Have It"

**Basis:** 21 of the story's 99 sentences, read in the partial reading (`partial_reading_index.json`): the first 20% of the beginning part (sentences 1–7), a random 20% of the middle part (sentences 35, 38, 41, 42, 57, 62 and 66; seed 42), and the last 20% of the end part (sentences 93–99)

**Written:** after the partial reading and before the full story was read closely

## 1. Phrases that produced the impression

| Sentence | Phrase | First reaction |
|---|---|---|
| 5 | "totally blind" | The narrator names his blindness at once, so the reader knows from the start what the girl does not. |
| 5 | "sensitive only to light and darkness" | His world is one of light and dark, not of shapes or faces. |
| 6 | "slapped against her heels" | His first knowledge of the girl comes from a sound. |
| 7 | "perhaps I never would" | Her appearance may stay unknowable. |
| 35 | "Then I made a mistake" | Something must be hidden, and the hiding can fail. |
| 38 | "Had she noticed already that I could not see?" | He is concealing his blindness, and he fears discovery. |
| 41 | "felt for the window ledge" | Touch guides him towards the window. |
| 42 | "making a pretence of studying the landscape" | Sight is acted out rather than exercised. |
| 57 | "an interesting face can also be pretty" | He comments on a face he cannot see. Appearance becomes something he says. |
| 66 | "forget our brief encounter" | The meeting is one-sided: it will stay with him and not with her. |
| 94 | "did she keep her hair long or short?" | Even at the end, her appearance remains a question. |
| 96 | "It was her eyes I noticed, not her hair" | The sighted man also sees only part of her. |
| 97–98 | "of no use to her … completely blind" | The twist: she was blind too. |
| 99 | "Didn't you notice?" | The irony is turned on the narrator, and also on the reader. |

## 2. Initial impression

The story seems to be about **two blind travellers who each perform sightedness for the other**. The narrator learns about the girl through sound and touch: her slippers, her voice, the window ledge. Meanwhile, sight is something he *talks about* in order to pass as sighted: the landscape, her "interesting face". The ending gives the decisive information to a sighted man, and his perception is partial too: he noticed her eyes, but not her hair. My impression is that the closing irony depends less on blindness itself than on the **social performance of sight**, and on the reader's assumption, shared with the narrator, that the girl can see.

## 3. Research problem

- **Research question:** How does "The Eyes Have It" distribute the vocabulary of sight, of the other senses, of performance and of imagination across its narrative? And does its closing irony depend on sight itself, or on the social performance of sight?
- **Sub-questions:**
    1. Where is the vocabulary of sight concentrated, and where is it absent?
    2. Where does the narrator's knowledge of the girl come from: words of sight, or words of the other senses?
    3. Does the vocabulary of performance coincide with the vocabulary of sight, so that sight appears as a performance?
    4. What fills the narrative where sight is absent?
- **Statement to test:**
    - **S1:** sight vocabulary will cluster at the two ends of the story, the narrator's declaration of blindness and the closing revelation.
    - **S2:** the middle of the story will be dominated by the vocabulary of performance (the pretence at the window, the flattery).
    - **S3:** the narrator's knowledge of the girl will come through the other senses rather than through sight.
- **What would falsify it:** sight vocabulary spread evenly through the story; performance vocabulary absent from the middle; or the vocabulary of the other senses absent from the passages in which the narrator learns about the girl.

## 4. Positionality and reflexivity

- **Prior familiarity:** [TO CONFIRM: keep the sentence that is true for you. "I had read this story before, at school, and knew its ending; the partial reading was therefore not a blind first encounter, and that prior knowledge is part of my fore-structure (Gadamer)." OR "I had not read the story before; the partial reading was my first encounter with it."]
- **Situatedness:** I read this story as a sighted reader, as a student of literature in India, and in English. Ruskin Bond's Dehra and Mussoorie are familiar places in the Indian literary imagination. Being sighted is the most important fact about my position: the story's twist works on sighted readers, and I am likely to share the assumptions it exposes. [TO CONFIRM: add or change details so that this paragraph describes your own position accurately.]
- **Expected bias:** I expect to find that sight is a performance and that knowledge lies in the other senses. To guard against seeing only that, I wrote down in advance what would falsify the statement. I verify every machine-extracted phrase against the text, and I compare my own lexicon with the LLM's extraction (Fig. 8).
- **Division of labour with the machine:** the LLM (run locally through Ollama) only *extracts* phrases along the four dimensions I defined. Defining the dimensions, building the annotated lexicon, assigning stages, and interpreting the results are my own interpretive acts, documented in this repository.

## 5. Framework

- **Erving Goffman, *Stigma*:** "passing" and "information control". People with a discreditable stigma manage what others can learn about them, and both travellers do this.
- **Maurice Merleau-Ponty, *Phenomenology of Perception*:** perception is embodied and multisensory. The blind man's stick becomes part of his body; here the hand on the window ledge does the same work.
- **Martin Jay, *Downcast Eyes*:** ocularcentrism, the cultural privilege of sight as the model of knowledge.
- **Rosemarie Garland-Thomson, *Extraordinary Bodies*:** the "normate", the unmarked default body that readers assume.
- **David T. Mitchell and Sharon L. Snyder, *Narrative Prosthesis*:** disability used as a narrative device, here to produce a twist.
- **Georgina Kleege, *Sight Unseen*:** a blind writer's critique of sighted assumptions about what blind people know.
- **Laura Mulvey, "Visual Pleasure and Narrative Cinema"** (secondary lens): the gaze, which the narrator performs verbally without being able to look.

## 6. Dimensions operationalised in the prompt

| Dimension | What counts | Examples from the partial reading |
|---|---|---|
| (a) Sight | seeing, looking, noticing, eyes, blindness, light and darkness, appearance | "totally blind", "her eyes I noticed" |
| (b) Other senses | hearing, touch, smell, bodily sensation | "slapped against her heels", "felt for the window ledge" |
| (c) Performance | pretending, hiding or discovering blindness, games, mistakes, flattery, social scripts | "making a pretence", "I made a mistake" |
| (d) Imagination | memory, inference, guessing, wondering, scenes pictured rather than perceived | "perhaps I never would", "long or short" |
