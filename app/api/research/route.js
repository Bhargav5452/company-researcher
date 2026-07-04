import { searchCompany, searchContactInfo, searchCompetitors } from '../../lib/serper';
import { crawlWebsite } from '../../lib/crawler';
import { analyzeCompany } from '../../lib/openrouter';

export const maxDuration = 60;

const STEP_LABELS = [
  'Searching Serper.dev for company information',
  'Crawling website pages — home, about, products, contact',
  'Collecting additional information from public sources',
  'Analyzing data with AI via OpenRouter',
  'Generating insights & identifying competitors',
];

const URL_PATTERN = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+/i;

function isUrl(query) {
  return URL_PATTERN.test(query);
}

export async function POST(request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (payload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const sendStep = (index) => {
        sendEvent({ type: 'step', index, label: STEP_LABELS[index] });
      };

      try {
        const { query, openrouterKey, serperKey, model } = await request.json();

        if (!query || !openrouterKey || !serperKey) {
          sendEvent({ type: 'error', message: 'Missing required fields: query, openrouterKey, and serperKey are required.' });
          controller.close();
          return;
        }

        sendStep(0);
        let website = null;
        let searchResults = null;

        if (isUrl(query)) {
          website = query.startsWith('http') ? query : `https://${query}`;
          searchResults = await searchCompany(website, serperKey);
        } else {
          searchResults = await searchCompany(query, serperKey);
          if (searchResults?.organic?.length > 0) {
            website = searchResults.organic[0].link;
          }
        }

        if (searchResults?.website) {
          website = searchResults.website;
        }

        if (!website) {
          sendEvent({ type: 'error', message: 'Could not find an official website for the given query.' });
          controller.close();
          return;
        }

        const companyName = searchResults?.companyInfo?.name || query;

        sendStep(1);
        let crawledData = { pages: [], contactInfo: {}, allContent: [] };
        try {
          crawledData = await crawlWebsite(website);
        } catch {}

        sendStep(2);
        const industry = searchResults?.companyInfo?.type || '';
        const [contactInfo, competitorInfo] = await Promise.all([
          searchContactInfo(companyName, serperKey).catch(() => ({ phone: null, address: null, snippets: [] })),
          searchCompetitors(companyName, industry, serperKey).catch(() => ({ organic: [], snippets: [] })),
        ]);

        sendStep(3);
        const collectedData = {
          companyName,
          website,
          knowledgeGraph: searchResults?.knowledgeGraph || null,
          crawledPages: crawledData.pages || [],
          searchSnippets: (searchResults?.organic || []).map(r => r.snippet).filter(Boolean),
          competitorSearchSnippets: competitorInfo?.snippets || [],
          contactInfo: {
            phone: contactInfo?.phone || crawledData?.contactInfo?.phone || null,
            email: crawledData?.contactInfo?.email || null,
            address: contactInfo?.address || crawledData?.contactInfo?.address || null,
          },
        };

        sendStep(4);
        const analysis = await analyzeCompany(collectedData, model, openrouterKey);

        sendEvent({
          type: 'result',
          data: {
            companyName: analysis.companyName || companyName,
            website: analysis.website || website,
            phone: analysis.phone || collectedData.contactInfo.phone || 'Not publicly listed',
            address: analysis.address || collectedData.contactInfo.address || 'Not publicly listed',
            summary: analysis.summary || '',
            products: analysis.products || [],
            painPoints: analysis.painPoints || [],
            competitors: analysis.competitors || [],
          },
        });
      } catch (error) {
        sendEvent({ type: 'error', message: error.message || 'An unexpected error occurred during research.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
