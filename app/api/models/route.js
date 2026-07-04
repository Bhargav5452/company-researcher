import { listModels } from '../../lib/openrouter';

const FEATURED_MODEL_IDS = [
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

const FALLBACK_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash' },
  { id: 'google/gemini-3.5-flash', name: 'Google: Gemini 3.5 Flash' },
  { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o-mini' },
  { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Anthropic: Claude Sonnet 4.5' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Anthropic: Claude Haiku 4.5' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B Instruct' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek: DeepSeek V3' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek: R1' },
];

export async function GET(request) {
  try {
    const openrouterKey = request.headers.get('x-openrouter-key') || undefined;

    // Fetch full list from OpenRouter (works without API key too)
    const allModels = await listModels(openrouterKey);

    // Group featured models
    const featured = allModels.filter(m => FEATURED_MODEL_IDS.includes(m.id));

    return Response.json({
      models: allModels,
      featured: featured.length > 0 ? featured : FALLBACK_MODELS,
      defaultModel: 'google/gemini-2.5-flash',
    });
  } catch (error) {
    console.error('Failed to fetch models from OpenRouter:', error);
    // Graceful fallback if OpenRouter is offline or rate-limiting
    return Response.json({
      models: FALLBACK_MODELS,
      featured: FALLBACK_MODELS,
      defaultModel: 'google/gemini-2.5-flash',
      fallback: true,
      error: error.message || 'Offline fallback',
    });
  }
}
