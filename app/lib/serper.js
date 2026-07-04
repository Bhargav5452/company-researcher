const SERPER_API_URL = 'https://google.serper.dev/search';

export async function searchCompany(query, apiKey) {
  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: `${query} company official website`,
      num: 10,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serper API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const result = {
    knowledgeGraph: data.knowledgeGraph || null,
    organic: (data.organic || []).slice(0, 8),
    website: null,
    companyInfo: {},
  };

  if (data.knowledgeGraph) {
    const kg = data.knowledgeGraph;
    result.website = kg.website || null;
    result.companyInfo = {
      name: kg.title || null,
      description: kg.description || null,
      type: kg.type || null,
      phone: kg.phone || null,
      address: kg.address || null,
    };
  }

  if (!result.website && data.organic && data.organic.length > 0) {
    result.website = data.organic[0].link;
  }

  return result;
}

export async function searchContactInfo(companyName, apiKey) {
  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: `${companyName} contact phone number address headquarters`,
      num: 5,
    }),
  });

  if (!response.ok) {
    return { phone: null, address: null };
  }

  const data = await response.json();
  const result = { phone: null, address: null, snippets: [] };

  if (data.knowledgeGraph) {
    result.phone = data.knowledgeGraph.phone || null;
    result.address = data.knowledgeGraph.address || null;
  }

  if (data.organic) {
    result.snippets = data.organic.map(r => r.snippet).filter(Boolean);
  }

  return result;
}

export async function searchCompetitors(companyName, industry, apiKey) {
  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: `${companyName} competitors alternatives ${industry || ''}`.trim(),
      num: 10,
    }),
  });

  if (!response.ok) {
    return { organic: [], snippets: [] };
  }

  const data = await response.json();

  return {
    organic: (data.organic || []).slice(0, 10),
    snippets: (data.organic || []).map(r => r.snippet).filter(Boolean),
    knowledgeGraph: data.knowledgeGraph || null,
  };
}

export async function search(query, apiKey, num = 10) {
  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serper API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
