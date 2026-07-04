const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export async function analyzeCompany(collectedData, model, apiKey) {
  const prompt = buildAnalysisPrompt(collectedData);
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://company-research-assistant.vercel.app',
      'X-Title': 'Company Research Assistant',
    },
    body: JSON.stringify({
      model: model || 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a senior business analyst specializing in company research. You analyze companies based on publicly available information and provide structured, insightful reports. Always respond with valid JSON only, no markdown formatting or code blocks around it.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from OpenRouter');
  }

  const content = data.choices[0].message.content;
  try {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      throw new Error('No JSON object found in AI response');
    }
    const jsonString = content.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${e.message}\nResponse: ${content.substring(0, 500)}`);
  }
}

function buildAnalysisPrompt(data) {
  const sections = [];
  sections.push(`COMPANY RESEARCH DATA:`);
  sections.push(`=====================`);

  if (data.companyName) sections.push(`\nCompany Name: ${data.companyName}`);
  if (data.website) sections.push(`Website: ${data.website}`);

  if (data.knowledgeGraph) {
    sections.push(`\n--- SEARCH ENGINE KNOWLEDGE GRAPH ---`);
    const kg = data.knowledgeGraph;
    if (kg.title) sections.push(`Title: ${kg.title}`);
    if (kg.description) sections.push(`Description: ${kg.description}`);
    if (kg.type) sections.push(`Type: ${kg.type}`);
    if (kg.phone) sections.push(`Phone: ${kg.phone}`);
    if (kg.address) sections.push(`Address: ${kg.address}`);
  }

  if (data.crawledPages && data.crawledPages.length > 0) {
    sections.push(`\n--- CRAWLED WEBSITE CONTENT ---`);
    for (const page of data.crawledPages) {
      sections.push(`\n[Page: ${page.url}]`);
      if (page.title) sections.push(`Title: ${page.title}`);
      sections.push(page.content.substring(0, 3000));
    }
  }

  if (data.searchSnippets && data.searchSnippets.length > 0) {
    sections.push(`\n--- SEARCH RESULTS SNIPPETS ---`);
    data.searchSnippets.forEach((s, i) => {
      sections.push(`${i + 1}. ${s}`);
    });
  }

  if (data.competitorSearchSnippets && data.competitorSearchSnippets.length > 0) {
    sections.push(`\n--- COMPETITOR SEARCH RESULTS ---`);
    data.competitorSearchSnippets.forEach((s, i) => {
      sections.push(`${i + 1}. ${s}`);
    });
  }

  if (data.contactInfo) {
    sections.push(`\n--- EXTRACTED CONTACT INFO ---`);
    if (data.contactInfo.phone) sections.push(`Phone: ${data.contactInfo.phone}`);
    if (data.contactInfo.email) sections.push(`Email: ${data.contactInfo.email}`);
    if (data.contactInfo.address) sections.push(`Address: ${data.contactInfo.address}`);
  }

  sections.push(`\n=====================`);
  sections.push(`\nBased on the above information, provide a comprehensive company research report. Respond with ONLY valid JSON in this exact format:`);
  sections.push(`{
  "companyName": "Official company name",
  "website": "https://company-website.com",
  "phone": "Phone number or 'Not publicly listed'",
  "address": "Company address or 'Not publicly listed'",
  "industry": "Primary industry/sector",
  "summary": "A 3-5 sentence comprehensive summary of the company, what they do, and their market position.",
  "products": ["Product/Service 1", "Product/Service 2", "Product/Service 3"],
  "painPoints": [
    "Detailed pain point 1 - specific business challenge the company faces",
    "Detailed pain point 2 - another specific challenge",
    "Detailed pain point 3 - market or operational challenge",
    "Detailed pain point 4 - growth or competitive challenge"
  ],
  "competitors": [
    {"name": "Competitor 1", "website": "https://competitor1.com"},
    {"name": "Competitor 2", "website": "https://competitor2.com"},
    {"name": "Competitor 3", "website": "https://competitor3.com"},
    {"name": "Competitor 4", "website": "https://competitor4.com"}
  ]
}`);

  return sections.join('\n');
}

export async function listModels(apiKey) {
  const headers = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers,
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const data = await response.json();
  const models = (data.data || [])
    .filter(m => m.id && m.name)
    .map(m => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length,
      pricing: m.pricing,
    }))
    .sort((a, b) => {
      const priority = [
        'google/gemini-2.5-flash',
        'google/gemini-3.5-flash',
        'openai/gpt-4o-mini',
        'openai/gpt-4o',
        'anthropic/claude-sonnet-4.5',
        'anthropic/claude-haiku-4.5',
        'meta-llama/llama-3.3-70b-instruct',
        'deepseek/deepseek-chat',
        'deepseek/deepseek-r1',
      ];
      const aIdx = priority.indexOf(a.id);
      const bIdx = priority.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

  return models;
}
