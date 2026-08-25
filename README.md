# Chemistry Study Buddy

A browser based Chemistry study assistant with a Nigerian Pidgin voice option, built from scratch with vanilla HTML, CSS, and JavaScript, no frontend frameworks.

**Live app:** https://hilary-aoao.github.io/chemistry-study-buddy/

## What it does

A student asks a Chemistry question, in plain English or Pidgin, and the app:

1. Searches a curated dataset of Chemistry questions and answers for the closest match
2. If a confident match is found, generates a grounded answer using that verified reference
3. If nothing matches, either says so honestly, or answers from general Chemistry knowledge with a clear label showing it is not from the verified dataset
4. Remembers the current topic so natural follow up questions like "explain that simpler" stay on topic instead of drifting to something unrelated

## Why it works this way

Most of the actual engineering here went into making the app honest about what it knows and does not know, rather than always producing a confident sounding answer. Every response is labeled, either as coming from the verified dataset, a follow up to a previous topic, or general knowledge outside the dataset, so a student always knows how much to trust what they are reading.

## Architecture

```
Browser (this repo, hosted on GitHub Pages)
   |
   |  question + retrieved reference
   v
Backend proxy server (separate repo, hosted on Render)
   |
   |  holds the real Groq API key privately
   v
Groq API (two models, chosen by voice mode)
```

The frontend never holds an API key. All requests are sent to a small backend proxy, which attaches the real key server side before forwarding to Groq. This means anyone can use the live app with no setup and no key of their own.

Backend repo: https://github.com/hilary-aoao/naija-study-buddy-backend

## How retrieval actually works

Retrieval is a custom word matching algorithm, not a machine learning model, written in plain JavaScript:

- Both the question and every dataset entry are tokenized (lowercased, punctuation stripped, split into words)
- Common stop words and generic filler words (the, is, explain, more, please, and so on) are filtered out, so matching is based on meaningful Chemistry vocabulary, not incidental shared words
- A simple stemming step reduces plurals to their singular form (hydrocarbons to hydrocarbon), so small wording differences do not cause a missed match
- Every dataset entry is scored against the question by counting meaningful word overlap, and the highest scoring entry above a confidence threshold is used

This was tuned through real testing, including catching and fixing a case where a vague follow up question ("explain more") was incorrectly matching an unrelated topic, since it scored just high enough to pass the confidence threshold by coincidence.

## Voice modes

- **Plain English** — generated with a smaller, faster model, answers grounded in the matched dataset entry, or clearly labeled general knowledge if nothing matches
- **Pidgin (big bro)** — generated with a larger model using few shot prompting, shown several real plain to Pidgin example pairs from the dataset so it learns the actual sentence structure, not just vocabulary swapped onto English. Pidgin mode intentionally stays strict to the verified dataset only, since general models are noticeably weaker at producing authentic Pidgin without real examples to draw from

## Tech stack

- HTML, CSS (Flexbox layout, custom design system, no framework)
- Vanilla JavaScript (async/await, Fetch API, DOM manipulation)
- Node.js and Express backend proxy (separate repo)
- Groq API (two models: a fast model for plain English, a larger model for Pidgin few shot generation)
- Hosted on GitHub Pages (frontend) and Render (backend)

## Running it locally

1. Clone this repo
2. Open `index.html` with a local server (for example the VS Code Live Server extension), since the app loads `data.json` via fetch, which some browsers block on a plain double clicked file
3. The app will call the live backend proxy automatically, no API key needed

## Dataset

`data.json` contains a growing, hand curated set of Chemistry questions, sourced and verified against the syllabus, each entry includes a plain English answer and a Pidgin answer, structured for both retrieval and few shot prompting. The dataset is actively being expanded topic by topic to close coverage gaps as they are found through real use.

## Known limitations

- The dataset does not yet cover every Chemistry topic. When a question falls outside it, plain English mode will say so and fall back to labeled general knowledge, Pidgin mode will say so honestly and decline
- Retrieval is word overlap based, not semantic search, so it can occasionally miss a correct match if a question is phrased very differently from anything in the dataset
- The backend runs on Render's free tier, which spins down after inactivity, the first request after a period of no use may be slow while it restarts

## Roadmap

- Continue expanding the dataset topic by topic, following the structured Chemistry syllabus
- Explore upgrading retrieval to real sentence embeddings for better handling of rephrased questions
- Add a printable or shareable summary of a study session
  
## License

© 2026 Hilary Orefo. All rights reserved.

This project is shared publicly as a portfolio piece demonstrating full-stack development, retrieval system design, and applied prompt engineering. The code, dataset, and content are not licensed for reuse, redistribution, or commercial use without explicit permission from the author.
