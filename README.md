# Bilingual Typing Test (English + Bengali)

A modern Next.js + Tailwind typing test app with:

- Language switcher (`English` / `বাংলা`)
- Timer durations (`1`, `5`, `10`, `15`, `20` minutes)
- Dynamic text loading from timer-specific local JSON files
- Unicode-aware Bengali typing support
- Real-time highlighting (correct/incorrect/current character)
- Real-time `WPM`, `Accuracy`, and `Errors`
- Anti-cheat protections for paste/copy/cut/drop
- Final result modal with restart flow

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data Files

Datasets live in `public/data/` and are named by language + timer:

- `en-1min.json`, `en-5min.json`, `en-10min.json`, `en-15min.json`, `en-20min.json`
- `bn-1min.json`, `bn-5min.json`, `bn-10min.json`, `bn-15min.json`, `bn-20min.json`

The app fetches one file based on current selection and picks one random document.

Example structure:

```json
{
	"language": "bn",
	"durationMinutes": 5,
	"documents": [
		{
			"id": "bn-5-001",
			"title": "একাগ্র অনুশীলন",
			"text": "...typing passage..."
		}
	]
}
```

You can scale each file to 1000+ documents by appending more items to `documents`.
