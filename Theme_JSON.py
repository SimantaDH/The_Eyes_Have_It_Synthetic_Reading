# Researcher-annotated themes for Ruskin Bond's "The Eyes Have It" (synthetic reading, Step 5).
#
# Format (as in the reference study's repository): one dict, `themes`, whose keys are
# Stage_<I|II|III>_<Dimension> and whose values are verbatim phrases from the story (lower-cased).
#
# Dimensions (from the initial impression and the prompt):
#   Sight        – seeing, looking, eyes, noticing, blindness, light/darkness, appearance
#   Senses       – the other senses: hearing (sound, voice), touch, smell, bodily feeling
#   Performance  – concealment and display: pretence, games, mistakes, flattery, daring, social scripts
#   Imagination  – memory, inference and fancy: the mind's eye, wondering, guessing, remembered scenes
#
# Stages (assigned by narrative function; boundaries are the story's own turning points):
#   Stage I   – Encounter / Concealment   (sentences 1–35): the narrator meets the girl, states his
#               blindness, reads her through sound, and resolves to hide that he cannot see.
#   Stage II  – Performance of Sight      (sentences 36–67): "Then I made a mistake" — the window, the
#               landscape, the face, the flattery: sight is enacted rather than exercised.
#   Stage III – Departure / Revelation    (sentences 68–99): the girl leaves, the new traveller arrives,
#               and the last lines reveal that she, too, was blind.
#
# The items are short (mostly 1–6 words). They were selected from the LLM extraction and a close
# reading, and every one is verified verbatim in the corpus by analysis.py (items_not_found.txt).

themes = {

    # --------------------------
    # STAGE I — Encounter / Concealment
    # --------------------------
    "Stage_I_Sight": [
        "totally blind",
        "sensitive only to light and darkness",
        "what the girl looked like",
        "her looks",
        "a dark corner",
        "good eyesight",
        "fail to see",
        "people who cannot see",
        "see very little",
        "i didn't see you either",
    ],
    "Stage_I_Senses": [
        "slapped against her heels",
        "the sound of her voice",
        "the sound of her slippers",
        "my voice startled her",
        "a little exclamation",
        "i heard you come in",
        "their remaining senses",
    ],
    "Stage_I_Performance": [
        "prevent her from discovering",
        "provided i keep to my seat",
        "better not get too familiar",
        "formidable creatures",
        "a romantic fool",
        "i made a mistake",
    ],
    "Stage_I_Imagination": [
        "perhaps i never would",
        "i suppose",
        "calling on my memories",
        "covered with wild dahlias",
        "the sun is delicious",
        "a log fire",
        "quiet and almost deserted",
        "my words had touched her",
    ],

    # --------------------------
    # STAGE II — Performance of Sight
    # --------------------------
    "Stage_II_Sight": [
        "what is it like outside",
        "i could not see",
        "look out of the window",
        "studying the landscape",
        "do you see any animals",
        "an interesting face",
        "a pretty face",
        "faced the girl",
    ],
    "Stage_II_Senses": [
        "felt for the window ledge",
        "the panting of the engine",
        "the rumble of the wheels",
        "a clear, ringing laugh",
        "listen to her talking",
        "her voice had the sparkle",
        "sat in silence",
    ],
    "Stage_II_Performance": [
        "making a pretence",
        "i faced it",
        "i ventured",
        "quite confidently",
        "becoming quite daring",
        "a safe remark",
        "resist flattery",
        "aloud i said",
        "a very gallant young man",
        "try to laugh for her",
    ],
    "Stage_II_Imagination": [
        "in my mind's eye",
        "telegraph posts flashing by",
        "the trees seem to be moving",
        "thought i",
        "a mountain stream",
        "forget our brief encounter",
        "it would stay with me",
    ],

    # --------------------------
    # STAGE III — Departure / Revelation
    # --------------------------
    "Stage_III_Sight": [
        "the world was shut out",
        "staring into the daylight",
        "darkness for me",
        "outside the window",
        "her eyes i noticed",
        "beautiful eyes",
        "of no use to her",
        "completely blind",
        "didn't you notice",
    ],
    "Stage_III_Senses": [
        "the engine's whistle shrieked",
        "their sound and rhythm",
        "the shouting of porters and vendors",
        "a high-pitched female voice",
        "the perfume from her hair",
        "touch her hair",
        "the scent of perfume",
        "stammered an apology",
        "the door banged",
        "the wheels took up their song",
        "groaned and shook",
    ],
    "Stage_III_Performance": [
        "a game to play",
        "a new fellow traveller",
        "a fascinating game",
        "you must be disappointed",
        "an interesting girl",
    ],
    "Stage_III_Imagination": [
        "i wondered if she wore her hair",
        "hanging loose over her shoulders",
        "cut very short",
        "that voice must have belonged",
        "guessing what went on out there",
        "my reverie",
        "long or short",
    ],
}
