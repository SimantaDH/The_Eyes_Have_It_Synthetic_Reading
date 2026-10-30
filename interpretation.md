# Step 7: Interpretation of the Results

All counts come from `outputs/dimension_counts_by_segment.csv` and `outputs/theme_counts_by_segment.csv`. The story's 99 sentences are divided into 20 equal segments of 4–5 sentences each. The counts are produced from the 95 phrases of the researcher-annotated lexicon (`Theme_JSON.py`), which yield 98 matches. The robustness check repeats the counting with 10 segments (`outputs_10_segments/`). Quotations are kept short. The story is in copyright, and the repository does not reproduce it.

## 1. What the figures show

**Sight (Fig. 6, top panel; 30 hits).** Sight vocabulary falls into **three clusters**: the opening (segments 1–3, 10 hits), the middle (segments 8–12, 11 hits) and the end (segments 17–20, 9 hits). It is completely absent from segments 4–7, 13–16 and 19. The final segment holds 5 sight hits, which ties the highest count of any dimension in any single segment (segment 3 also has 5): "her eyes I noticed", "beautiful eyes", "of no use to her", "completely blind", "Didn't you notice?".

**Other senses (25 hits).** The other senses form two bands. One is the opening encounter (segments 2–4, 7 hits: "slapped against her heels", "the sound of her voice"). The other, larger band is the departure (segments 13–18, 13 hits, 52%: "her voice had the sparkle", "the perfume from her hair", "touch her hair", "the scent of perfume"). The last two segments contain **no** other-sense vocabulary at all.

**Performance (21 hits).** Performance vocabulary peaks in the middle: segments 9–12 hold 10 of the 21 hits (48%), from "making a pretence" and "quite confidently" to "resist flattery" and "a very gallant young man". A smaller band in segments 4–7 holds the narrator's resolve to conceal ("prevent her from discovering", "provided I keep to my seat"), and segments 17–19 hold the new "game to play". No performance phrase occurs in segments 1–3 or in the final segment.

**Imagination (22 hits).** Imagination peaks in segment 6, the remembered hills of Mussoorie ("calling on my memories", "covered with wild dahlias", "a log fire"), and in segment 14, the parting ("forget our brief encounter", "I wondered if she wore her hair"). **14 of the 22 imagination hits (64%) fall in the nine segments that contain no sight vocabulary at all.** Those nine segments make up only 45% of the story. Only 10 of 25 other-sense hits (40%) fall in them.

**Balance (Fig. 7).** Subtracting sight hits from other-sense hits shows sight dominating at the opening (segments 1 and 3), throughout the performance (segments 8 and 10–12) and, most strongly, in the final segment (−5). The other senses dominate in segments 2, 4 and 9, and then in an unbroken run through the departure, segments 13–17.

**Stages (Figs. 1–5).** Because the stages were defined by the story's turning points, Stage I dominates segments 1–7, Stage II segments 8–13 and Stage III segments 14–20. These figures illustrate the reading. The test of the statement rests on the stage-independent dimension counts in Figs. 6–8.

**Robustness.** With 10 segments the same pattern holds. Sight still forms three clusters (segments 1–2, 4–6 and 9–10). Performance peaks in the middle (6 hits in segment 6). The other senses are strongest during the departure (segments 7–9, 13 hits) and absent from the final segment. The balance runs from +4 and +5 in segments 7–8 to −5 in segment 10.

<!-- LLM_REPLICATION -->
**LLM replication (Fig. 8).** The local model (qwen2.5:7b, run through Ollama on a local GPU, in 3 chunks) extracted 118 phrases. 85.6% occur verbatim in the story, and 83.1% occur in the sentence the model named. Counted across the same 20 segments, the verified extraction reproduces the lexicon's distribution only weakly, so the counts above depend on the researcher's lexicon and should be read with that caution (overall r = 0.07; sight 0.04, other senses 0.10, performance -0.17, imagination 0.12). The model also extracted 60 of the 95 lexicon phrases (63.2%), either exactly or as a longer or shorter phrase (`lexicon_llm_overlap.csv`).
<!-- /LLM_REPLICATION -->

## 2. Was the statement supported?

- **S1 was partly supported, with the most important qualification of the study.** Sight vocabulary does cluster at both ends of the story. But its largest cluster lies in the middle, where the narrator is pretending to see. Sight words are not only the words of blindness and revelation. They are the language of the performance itself.
- **S2 was supported.** Performance vocabulary peaks in segments 9–12 (48% of its hits), the window scene and the flattery. It coincides there with the middle cluster of sight.
- **S3 was supported.** The other senses dominate where the narrator gathers knowledge of the girl: her slippers and voice at the start, and her voice, perfume and hair at the parting (segments 13–17).
- **Not predicted:** imagination concentrates where sight is absent (64% of its hits fall in sight-free segments). And the revelation in the final segment is delivered entirely in the vocabulary of sight, with no other-sense words at all.

## 3. Interpretation

**Sight as a spoken performance.** The middle cluster of sight vocabulary (segments 8–12) coincides with the peak of performance vocabulary. This shows that in "The Eyes Have It" sight is above all something characters *say*. The narrator asks "What is it like outside?", is told to "look out of the window", makes "a pretence of studying the landscape", and compliments "an interesting face". Goffman's account of passing describes this exactly. A person with a discreditable stigma manages information so that others will not discover it, and conversation is where the management happens. The narrator's resolve is stated early ("prevent her from discovering", "provided I keep to my seat"). The middle of the story then enacts it in the shared, sighted language of landscapes and faces. Martin Jay's account of ocularcentrism explains why this language serves so well as a disguise: in a culture that equates knowing with seeing, speaking the vocabulary of sight is enough to pass as sighted. The final line shows that the girl was passing too, so the whole middle of the story is a conversation between two performances.

**Knowledge through the other senses.** The balance chart (Fig. 7) shows where knowledge actually comes from. It is positive whenever the narrator is learning about the girl rather than performing for her: her slippers "slapped against her heels"; he "felt for the window ledge"; "her voice had the sparkle of a mountain stream"; "the perfume from her hair"; "the scent of perfume still lingered". Merleau-Ponty's phenomenology treats perception as embodied and multisensory rather than visual, and his example of the blind man's stick, which becomes an extension of the body, fits the hand on the window ledge. Georgina Kleege's critique of sighted assumptions applies too. The narrator's knowledge of the girl is rich, intimate and accurate: he knows her voice, her laugh, her scent, her nearness. It lacks only what a sighted culture counts as knowledge, namely her appearance ("did she keep her hair long or short?").

**Imagination in the gaps.** Imagination occupies the stretches that sight leaves empty: 14 of its 22 hits fall in sight-free segments. Two scenes carry most of it. In segment 6 the narrator describes the hills of Mussoorie "calling on my memories": wild dahlias, a delicious sun, a log fire. Here memory stands in for present sight and lets him join a sighted conversation about scenery. In segment 14 he wonders whether she "wore her hair in a bun" or whether it was "hanging loose over her shoulders": here imagination stands in for sight in desire. The "mind's eye" is not a metaphor in this story. It is the faculty that does the work the eyes cannot. It serves both concealment and longing.

**The revelation and the sighted reader.** The final segment is the most visual moment of the story (5 sight hits, no other-sense words), and it belongs to the only sighted character. Yet his sight is also partial: "It was her eyes I noticed, not her hair." He saw what the narrator could not, and missed what the narrator wanted to know. The twist works only because the reader, like the narrator, has assumed all along that the girl could see. Rosemarie Garland-Thomson calls this unmarked default body the "normate". "Didn't you notice?" is addressed to the narrator, but it reaches the reader, whose sighted assumptions the story has exploited. Mitchell and Snyder's idea of "narrative prosthesis" raises a critical question here. The story uses the girl's blindness as the device of its surprise, and so risks treating disability as a punchline. At the same time, the distribution of its vocabulary shows that the surprise exposes sighted assumptions rather than blind deficiency: the blind characters knew more about each other's voices and presence than the sighted man knew about the girl.

**A gendered gaze without sight.** As a secondary lens, Laura Mulvey's analysis of the male gaze sharpens the flattery scene. The narrator performs the gaze ("You have an interesting face", "an interesting face can also be pretty") without being able to look, and "Few girls can resist flattery" is offered as a sighted man's commonplace. The girl resists the script ("I'm tired of people telling me I have a pretty face"), even while performing her own sightedness. The gaze in this story is a social script that both characters speak, not an act of seeing. That supports the main finding that sight here is performance.

## 4. Limitations

- **Small numbers.** The story has 99 sentences (about 1,100 words), and most cells hold 0–5 hits. The figures show patterns that provoke interpretation, in Ramsay's sense of algorithmic criticism. They are not statistical evidence.
- **Circularity of the stages.** The stages follow the story's turning points, so Figs. 1–5 illustrate the reading. The statement is tested on the stage-independent dimension counts (Figs. 6–7), and the lexicon is cross-checked against the LLM extraction (Fig. 8).
- **The lexicon.** The annotated lexicon is a selection of short phrases, and its boundaries between dimensions are interpretive. "Faced the girl", for example, is coded as sight but is also performance. The lexicon was drafted with AI assistance from a close reading and checked against the verified Ollama extraction (`lexicon_llm_overlap.csv`).
- **The source.** The corpus is a blog transcription of the story, not the print edition, and it contains a few punctuation slips (listed in `corpus_info.json`). They do not affect the phrase counts, but citations should refer to the printed text.
- **What counting cannot see.** Tone, irony, and the timing of the twist are invisible to frequency counts, and close reading has to supply them.
- **Extraction model.** A single run of one local open-weight model produced the extraction. A different model, or a different run, may extract different phrases, which is why every item is verified and the lexicon comparison is reported.
- **Positionality.** As stated in Step 2, I am a sighted reader. The story's twist is designed for readers like me, and I may under-read what a blind reader would notice first.

## Works cited

- Bond, Ruskin. "The Eyes Have It." *The Night Train at Deoli and Other Stories*, Penguin Books, 1988.
- Garland-Thomson, Rosemarie. *Extraordinary Bodies: Figuring Physical Disability in American Culture and Literature*. Columbia UP, 1997.
- Ghosh, Sourav, Shanmugapriya T, and Sanatan Mandal. "Synthetic Reading: Towards a Hermeneutic-Computational Method for Literary Interpretation through Tagore's 'A Wife's Letter'." *International Journal of Humanities and Arts Computing*, vol. 20, no. 2, 2026, pp. 216–37, doi:10.3366/ijhac.2026.0378.
- Goffman, Erving. *Stigma: Notes on the Management of Spoiled Identity*. Prentice-Hall, 1963.
- Jay, Martin. *Downcast Eyes: The Denigration of Vision in Twentieth-Century French Thought*. U of California P, 1993.
- Kleege, Georgina. *Sight Unseen*. Yale UP, 1999.
- Merleau-Ponty, Maurice. *Phenomenology of Perception*. Translated by Donald A. Landes, Routledge, 2012.
- Mitchell, David T., and Sharon L. Snyder. *Narrative Prosthesis: Disability and the Dependencies of Discourse*. U of Michigan P, 2000.
- Mulvey, Laura. "Visual Pleasure and Narrative Cinema." *Screen*, vol. 16, no. 3, 1975, pp. 6–18.
- Ramsay, Stephen. *Reading Machines: Toward an Algorithmic Criticism*. U of Illinois P, 2011.
