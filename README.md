# 🔥 THE KINETIC PULP — Resume Roaster

A brutally honest AI-powered resume roaster. Upload your PDF resume and get scorched.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure your API key
Copy the example env file and add your Gemini API key:
```bash
cp .env.example .env
```

Open `.env` and replace the placeholder:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

### 3. Start the server
```bash
npm start
```

### 4. Open the app
Navigate to: http://localhost:3000

---

## How it works

- Your API key lives **only in `.env`** — it is never exposed to the browser.
- The Node.js server (`server.js`) acts as a proxy: the browser posts the PDF to `/api/gemini`, and the server forwards it to Google's Gemini API with your key attached server-side.
- Static files (HTML, CSS, JS) are served from the `public/` folder.

## File structure

```
kinetic-pulp/
├── server.js          ← Node.js server + Gemini proxy
├── package.json
├── .env               ← Your API key goes here (never commit this)
├── .env.example       ← Template — safe to commit
├── .gitignore
└── public/
    └── index.html     ← The full UI
```
