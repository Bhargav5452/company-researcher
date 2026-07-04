# Company Research Assistant — AI-Powered Intelligence

An AI-powered company research assistant that enables users to research any company by providing either the company name or website URL. The application automatically gathers information from the company's website and public sources, analyzes it using AI, identifies competitors, and generates a professional downloadable PDF report.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![OpenRouter](https://img.shields.io/badge/OpenRouter-AI-blue)
![Serper.dev](https://img.shields.io/badge/Serper.dev-Search-green)

## ✨ Features

- **Company Research** — Enter a company name or URL to get comprehensive insights
- **Website Crawling** — Intelligent crawler discovers and analyzes key pages (Home, About, Products, Services, Contact, Pricing)
- **Serper.dev Search Integration** — Uses Google Search API for finding company info, contact details, and competitors
- **OpenRouter AI Analysis** — Supports any OpenRouter model for generating summaries, pain points, and competitor analysis
- **AI Model Selection** — Choose from dozens of AI models (GPT-4o, Claude, Gemini, Llama, etc.)
- **Professional PDF Reports** — One-click downloadable PDF with all research findings
- **Discord Integration** — Auto-send reports to Discord channels after generation
- **ChatGPT-Style Interface** — Modern, responsive dark-themed UI with real-time progress indicators
- **Mobile Responsive** — Works beautifully on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- An [OpenRouter](https://openrouter.ai/) API key
- A [Serper.dev](https://serper.dev/) API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd company-research-assistant

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Configuration

No environment variables are required on the server. All API keys are configured directly in the UI:

1. Open the app in your browser
2. In the sidebar, enter your **OpenRouter API Key** and **Serper.dev API Key**
3. Select your preferred AI model
4. Click **Save Configuration**
5. Start researching!

### Environment Variables (Optional)

No `.env` file is needed — API keys are entered client-side and passed to API routes per-request. They are stored in your browser's `localStorage` for convenience.

## 📖 How It Works

1. **User Input** — Enter a company name (e.g., "Stripe") or website URL (e.g., "https://stripe.com")
2. **Search** — Serper.dev searches for the company's official website and public information
3. **Crawl** — The crawler visits key pages (home, about, products, contact, pricing) and extracts content
4. **Additional Research** — Serper.dev gathers competitor information and additional context
5. **AI Analysis** — OpenRouter processes all collected data to generate structured insights
6. **Report** — Results are displayed in a beautiful report card with download and Discord options

## 🏗️ Project Structure

```
company-research-assistant/
├── app/
│   ├── api/
│   │   ├── research/
│   │   │   └── route.js      # Main SSE research endpoint
│   │   ├── models/
│   │   │   └── route.js      # OpenRouter model listing
│   │   └── discord/
│   │       └── route.js      # Discord message sender
│   ├── lib/
│   │   ├── crawler.js         # Website crawling engine
│   │   ├── serper.js          # Serper.dev API integration
│   │   ├── openrouter.js      # OpenRouter AI integration
│   │   └── pdfGenerator.js    # Client-side PDF generation
│   ├── globals.css            # Dark-theme design system
│   ├── layout.js              # Root layout with fonts/meta
│   └── page.js                # Main ChatGPT-style interface
├── package.json
├── next.config.js
└── README.md
```

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Frontend | React, Vanilla CSS |
| Search | Serper.dev API |
| AI | OpenRouter API |
| Crawling | Cheerio + Fetch |
| PDF | jsPDF (client-side) |
| Discord | Discord REST API v10 |
| Deployment | Vercel |

## 🎯 Key Features Explained

### Website Crawling
- Discovers important pages from the homepage (About, Products, Services, Contact, Pricing)
- Uses URL pattern matching to prioritize important pages
- Ignores login, auth, blog, and irrelevant pages
- Extracts contact info (phone, email, address) via regex patterns
- Limits to 8 pages max per site for performance
- Deduplicates URLs by normalization

### AI Analysis
- Sends structured prompts with all collected data to OpenRouter
- Generates: company summary, products/services, pain points, competitor suggestions
- Returns structured JSON for consistent rendering
- Supports model selection from OpenRouter's catalog

### PDF Generation
- Professional dark-header design with gold accent
- Sections: Company Info, Summary, Products, Pain Points, Competitors
- Auto page-break handling
- Generated client-side using jsPDF — no server load

### Discord Integration
- Configure Bot Token and Channel ID in the sidebar
- After research completes, auto-sends report to Discord
- Includes: Applicant details, Company info, PDF attachment
- Uses Discord Bot REST API with FormData for file uploads

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to [Vercel](https://vercel.com) for automatic deployments.

### Deploy to Netlify / Cloudflare

The app is a standard Next.js application and can be deployed to any platform that supports Next.js:
- **Netlify**: Use the `@netlify/plugin-nextjs` plugin
- **Cloudflare**: Use `@cloudflare/next-on-pages`

## 📝 API Documentation

### POST /api/research
Main research endpoint using Server-Sent Events (SSE).

**Request Body:**
```json
{
  "query": "Stripe",
  "openrouterKey": "sk-or-v1-...",
  "serperKey": "...",
  "model": "google/gemini-2.0-flash-001"
}
```

**SSE Events:**
- `{type: "step", index: 0, label: "..."}` — Progress update
- `{type: "result", data: {...}}` — Final report data
- `{type: "error", message: "..."}` — Error message

### GET /api/models
Lists available OpenRouter models.

**Headers:** `x-openrouter-key: sk-or-v1-...`

### POST /api/discord
Sends report to Discord channel.

**Request Body:**
```json
{
  "botToken": "...",
  "channelId": "...",
  "applicantName": "John Doe",
  "applicantEmail": "john@example.com",
  "companyName": "Stripe",
  "companyWebsite": "https://stripe.com",
  "pdfBase64": "..."
}
```

## 📄 License

MIT
