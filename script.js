console.log("script.js is connected");

const inputBox = document.getElementById("inputBox");
const sendBtn = document.getElementById("sendBtn");
const page = document.querySelector(".page");

inputBox.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    sendBtn.click();
  }
});

let dataset = [];
let lastEntry = null;
let voiceMode = "plain";

let examplesBlock = "";

async function loadDataset() {
  const response = await fetch("data.json");
  dataset = await response.json();
  console.log("Loaded", dataset.length, "entries");
  buildExamplesBlock();
}

function buildExamplesBlock() {
  const shuffled = [...dataset].sort(() => Math.random() - 0.5);
  const samples = shuffled.slice(0, 4);
  examplesBlock = samples
    .map(e => "Plain: " + e.plain_answer + "\nPidgin: " + e.pidgin_answer)
    .join("\n\n");
}

loadDataset();

const tickPlain = document.getElementById("tickPlain");
const tickPidgin = document.getElementById("tickPidgin");

tickPlain.addEventListener("click", function () {
  voiceMode = "plain";
  tickPlain.classList.add("active");
  tickPidgin.classList.remove("active");
});

tickPidgin.addEventListener("click", function () {
  voiceMode = "pidgin";
  tickPidgin.classList.add("active");
  tickPlain.classList.remove("active");
});


const STOPWORDS = new Set([
  "the", "is", "a", "an", "of", "to", "in", "and", "for", "on", "with",
  "what", "how", "does", "do", "are", "why", "which", "was", "were",
  "be", "it", "this", "that", "as", "by", "from", "or", "at", "can",
  "you", "we", "explain", "tell", "me", "about", "will", "state",
  "more", "further", "again", "please", "simple", "simpler", "well",
  "properly", "clearly", "correctly", "differently", "briefly", "okay", "ok", "now"
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word))
    .map(function (word) {
      if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
      if (word.endsWith("ses") && word.length > 4) return word.slice(0, -2);
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
      return word;
    });
}

function scoreEntry(questionWords, entry) {
  const entryText = entry.topic + " " + entry.question;
  const entryWords = tokenize(entryText);

  let matches = 0;
  for (const word of questionWords) {
    if (entryWords.includes(word)) {
      matches++;
    }
  }
  return matches;
}

function findBestMatch(question) {
  const questionWords = tokenize(question);

  let bestEntry = null;
  let bestScore = 0;

  for (const entry of dataset) {
    const score = scoreEntry(questionWords, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return { entry: bestEntry, score: bestScore };
}

sendBtn.addEventListener("click", async function () {
  const question = inputBox.value;

  if (question === "") {
    return;
  }

addMessage("user", question);
inputBox.value = "";


const rawMatch = findBestMatch(question);
const MIN_SCORE = 1;

let entry = null;
let isFollowUp = false;

if (rawMatch.entry !== null && rawMatch.score >= MIN_SCORE) {
  entry = rawMatch.entry;
  lastEntry = entry;
} else if (lastEntry !== null) {
  entry = lastEntry;
  isFollowUp = true;
}

let systemPrompt;
let answerLabel;

if (entry === null && voiceMode === "pidgin") {
  systemPrompt = "You are Big Bro, a study buddy for Chemistry. The student asked something with no match in your reference material. Be honest that you don't have material on that yet, don't guess. Keep it short and encouraging, in warm Pidgin. Use only plain punctuation, no asterisks, markdown, or em dashes.";
  answerLabel = "no verified match in dataset";
} else if (entry === null && voiceMode === "plain") {
  systemPrompt = "You are Big Bro, a warm, encouraging study buddy for Chemistry. This question is not covered in your verified dataset, so answer using your own general Chemistry knowledge instead, clearly and accurately. Use only plain punctuation, no asterisks, markdown, or em dashes.";
  answerLabel = "general knowledge, not from verified dataset";
} else {
  systemPrompt =
    "You are Big Bro, a warm, encouraging study buddy for Chemistry. Answer ONLY using the reference below, do not use outside knowledge. If the question asks about something the reference does not actually cover, honestly say you do not have that specific information in your dataset yet, do not stretch the reference to sound like it answers something it does not. Keep it clear and reasonably short. Use only plain punctuation, periods, commas, and question marks, no asterisks, markdown, or em dashes.\n\n" +
    "Reference topic: " + entry.topic + "\n" +
    "Reference answer: " + entry.plain_answer +
    (isFollowUp ? "\n\nNote: this may be a follow-up, but only treat it as answerable if the reference genuinely covers what is being asked." : "");
  answerLabel = isFollowUp ? "verified dataset, follow-up: " + entry.topic : "verified dataset: " + entry.topic;
}

let requestBody;
if (voiceMode === "pidgin" && entry !== null) {
const pidginPrompt =
  "Here are real examples of explaining Chemistry in warm, natural Nigerian Pidgin English, " +
  "like a big brother teaching his sibling. Study the sentence structure closely, not just the vocabulary. " +
  "Use only plain punctuation, periods, commas, and question marks, no asterisks, markdown, numbered lists, or em dashes.\n\n" +
  examplesBlock +
  "\n\nNow, using ONLY the reference fact below, answer the student's question in this same natural Pidgin style.\n\n" +
  "Reference: " + entry.plain_answer + "\n\n" +
  "Student's question: " + question + "\n\nPidgin answer:";
  requestBody = {
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: pidginPrompt }],
  };
} else {
  requestBody = {
    model: "openai/gpt-oss-20b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
  };
}

const response = await fetch("https://naija-study-buddy-api.onrender.com/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
});

  const data = await response.json();

  addMessage("bot", data.choices[0].message.content, answerLabel);  
});

function addMessage(role, text, annotation) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "msg " + role;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble";
  bubbleDiv.textContent = text;

  messageDiv.appendChild(bubbleDiv);

  if (annotation) {
    const annotationDiv = document.createElement("div");
    annotationDiv.className = "annotation";
    annotationDiv.textContent = annotation;
    messageDiv.appendChild(annotationDiv);
  }

  page.appendChild(messageDiv);
  page.scrollTop = page.scrollHeight;
}