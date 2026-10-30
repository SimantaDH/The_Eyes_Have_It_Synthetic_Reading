# Synthetic Reading of Ruskin Bond's "The Eyes Have It"

This repository presents a hermeneutic-computational reading of Ruskin Bond's short story "The Eyes Have It". It follows the **synthetic reading** method of Ghosh, Shanmugapriya T and Mandal (2026), in which interpretation comes *before* computation:

1. A partial reading produces an initial impression.
2. The impression becomes a prompt.
3. A local LLM (Ollama) extracts textual features, and the features are verified against the text.
4. The researcher computes, visualises and interprets the results through literary and cultural theory.

**Project website:** https://SimantaDH.github.io/The_Eyes_Have_It_Synthetic_Reading/ (published from the `docs/` folder with GitHub Pages)

**Researcher:** Simanta Nandi, [TO CONFIRM: programme, department, institute]
**Supervisor:** [TO CONFIRM: name]
**Date:** October 2026

## Research question

> How does "The Eyes Have It" distribute the vocabulary of sight, of the other senses, of performance and of imagination across its narrative? And does its closing irony depend on sight itself, or on the social performance of sight?

**Statement tested:**
- **S1:** sight vocabulary clusters at the two ends of the story.
- **S2:** performance vocabulary dominates the middle.
- **S3:** the narrator's knowledge of the girl comes through the other senses.

**Framework:** Goffman on passing and information control; Merleau-Ponty on embodied perception; Martin Jay on ocularcentrism; Garland-Thomson's "normate"; Mitchell and Snyder's "narrative prosthesis"; Georgina Kleege; and, as a secondary lens, Laura Mulvey on the gaze.

## Main findings

- **Sight** vocabulary forms three clusters: the opening (10 of 30 hits), the middle (11) and the end (9). The middle cluster coincides with the peak of **performance** vocabulary (48% of its hits in segments 9–12). In this story, sight is above all something the characters *say*.
- **The other senses** carry the narrator's knowledge of the girl: her slippers and voice at the start, and her voice, perfume and hair at the parting (52% of hits in segments 13–18).
- **Imagination** fills the gaps that sight leaves: 64% of its hits fall in the nine segments with no sight vocabulary at all.
- **The revelation** is the most purely visual moment of the story (5 sight hits, no other-sense words), and it belongs to the only sighted character, whose sight is also partial ("her eyes I noticed, not her hair").
- S2 and S3 are supported. S1 is partly supported, with a qualification: sight's largest cluster is the performance of sight.

## Copyright and what this repository contains

"The Eyes Have It" is © Ruskin Bond. It was first collected in *The Night Train at Deoli and Other Stories* (Penguin Books, 1988), and it is in copyright. **This repository therefore does not redistribute the story.** The full text, the downloaded source page, and the 21 partially read sentences are kept in the researcher's private copy and listed in `.gitignore`.

What *is* published lets anyone verify and reproduce the study:

- `corpus_info.json`: word and sentence counts, the noise removed, the punctuation slips found, and the **SHA-256 hash** of the cleaned corpus. Running `prepare_corpus.py` on the same source produces the same hash.
- `partial_reading_index.json`: the partial-reading design and the sentence numbers that were read.
- The prompt, the LLM output (short phrases with sentence numbers), the verification, the lexicon, all counts, all figures and the website.

Short quotations appear in the analysis for the purposes of criticism and review.

## Repository contents

| File | Step | What it is |
|---|---|---|
| `Synthetic_Reading_The_Eyes_Have_It.ipynb` | all | Google Colab notebook that runs every step (partial-reading output cleared) |
| `project.json` | — | Title, source, stage and dimension labels, segment count |
| `common.py` | — | Shared helpers: sentence split, normalisation, segmentation, phrase matching |
| `prepare_corpus.py` | 3 | Downloads the story page and removes the noise. Writes the corpus (private) and `corpus_info.json` (public) |
| `corpus_info.json` | 3 | Counts, noise removed, punctuation slips, SHA-256 of the corpus |
| `partial_reading.py` | 1 | Divides the story into 3 equal parts and selects 20% of the sentences in each |
| `partial_reading_index.json` | 1 | The design and the 21 sentence numbers read |
| `initial_impression.md` | 2 | Impression, research question, falsification conditions, positionality, framework |
| `prompt.txt` | 4 | The exact prompt given to the local LLM |
| `extract_with_ollama.py` | 3, 5 | Sends the numbered story and the prompt to Ollama, then verifies every item |
| `llm_raw_output.json` | 5 | The model's answer: phrases and sentence numbers |
| `llm_run_log.json` | 5 | Model, chunks, temperature, seed, date, SHA-256 of the prompt |
| `llm_items_verified.csv`, `llm_verification.txt`, `llm_verification.json` | 5 | Each item checked verbatim against the story and against the sentence the model named |
| `lexicon_llm_overlap.csv` | 5 | Which lexicon phrases the LLM also extracted |
| `Theme_JSON.py` | 5 | Researcher-annotated lexicon: 95 phrases in 3 stages × 4 dimensions |
| `analysis.py` | 6 | Counting, Figs. 1–8 (JPG and interactive HTML), `results.json` |
| `outputs/` | 6 | `figures/*.jpg`, `interactive/*.html`, CSV tables, `results.json` (20 segments) |
| `outputs_10_segments/` | 6 | Robustness check with 10 segments |
| `interpretation.md` | 7 | Interpretation through literary and cultural theory, limitations, works cited |
| `docs/` | site | The project website (GitHub Pages) |

## Method in brief

1. **Pre-processing.** The story was taken from a web transcription. Everything outside the story was removed: site header, blog metadata, the author signature and everything after it, image captions, and empty lines. The text was **not** lower-cased, stemmed or stripped of stop words. The result has 99 sentences in 40 paragraphs.
2. **Partial reading.** The 99 sentences were divided into 3 equal parts of 33 sentences each. The first 20% of the beginning part was read (sentences 1–7), then a random 20% of the middle part (sentences 35, 38, 41, 42, 57, 62 and 66; seed 42), then the last 20% of the end part (sentences 93–99): 21 sentences in all.
3. **Initial impression.** The impression, research question, falsification conditions and positionality statement were written before the full text was read closely.
4. **Query generation.** The prompt operationalises the impression in four dimensions: sight, other senses, performance and imagination. It asks for verbatim phrases of 1–8 words, each with its sentence number, in a fixed JSON schema, and it forbids interpretation.
5. **Targeted extraction.** The numbered story and the prompt were sent to a local open-weight model through Ollama, in three chunks of consecutive sentences. Every item was verified verbatim against the story and against the sentence the model named. The researcher-annotated lexicon assigns 95 phrases to three stages defined by the story's turning points: I, Encounter / Concealment (sentences 1–35); II, Performance of Sight (36–67); III, Departure / Revelation (68–99).
6. **Computation and visualisation.** The phrases were counted across 20 equal segments, and eight figures were drawn. Fig. 8 replicates the dimension counts using only the verified LLM extraction. The analysis was repeated with 10 segments as a robustness check.
7. **Interpretation.** The patterns were read through the framework and checked against a close reading of the full text.

## Reproduce

**Google Colab (recommended).** Open `Synthetic_Reading_The_Eyes_Have_It.ipynb` in Colab, choose **Runtime → Change runtime type → T4 GPU**, and run the cells from top to bottom. The notebook:

- cleans the story from the source page;
- runs the partial reading;
- runs Ollama;
- verifies the extraction;
- draws every figure (JPG and HTML);
- builds the website;
- pushes this repository and switches on GitHub Pages.

**Locally:**

```bash
pip install -r requirements.txt
python prepare_corpus.py                    # Step 3: pre-processing (or --raw saved_page.html)
python partial_reading.py                   # Step 1: partial reading
ollama pull qwen2.5:7b
python extract_with_ollama.py --model qwen2.5:7b --chunks 3   # Steps 3 and 5
python analysis.py --site docs              # Step 6: outputs/ and the website data
python analysis.py --segments 10 --site docs  # robustness check
```

## AI use statement

The extraction in Step 5 was carried out by a local open-weight LLM, as the synthetic reading method prescribes. AI assistance was also used to write the project code and the website, to draft the annotated lexicon, and to draft and edit the project text. [TO CONFIRM: revise this statement so that it describes your own use of AI accurately and meets your institute's policy.] The research design, the stage assignment and the interpretive argument are the researcher's responsibility.

## Sources

- Ruskin Bond, "The Eyes Have It", in *The Night Train at Deoli and Other Stories* (Penguin Books, 1988). The web transcription used as the corpus source is: https://gauravsk98.wordpress.com/2018/02/14/the-eyes-have-it-by-ruskin-bond/
- S. Ghosh, Shanmugapriya T and S. Mandal, "Synthetic reading: Towards a hermeneutic-computational method for literary interpretation through Tagore's 'A Wife's Letter'", *International Journal of Humanities and Arts Computing* 20.2 (2026): 216–237. DOI: 10.3366/ijhac.2026.0378.
- Reference repository: https://github.com/SouravGhosh-digital-humanities/Wifes_Letter_JSON_themes
