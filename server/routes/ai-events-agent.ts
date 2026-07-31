import { Router } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import * as dbSupabase from '../db-supabase.js';

const router = Router();

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  return new GoogleGenAI({ apiKey });
};

// In-memory history to avoid duplicates
const submissionHistory = new Set<string>();

function getItemKey(title: string, url: string): string {
  return `${title.toLowerCase().trim()}-${url.toLowerCase().trim()}`;
}

// Search and auto-fill event or opportunity
router.post('/search-and-fill', async (req, res) => {
  try {
    const { query, type } = req.body; // type: 'event' or 'opportunity'

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    if (!type || !['event', 'opportunity'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "event" or "opportunity"' });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (error) {
      return res.status(500).json({
        error: 'API key not configured',
        message: error instanceof Error ? error.message : 'GEMINI_API_KEY missing',
      });
    }

    // Fetch existing items to avoid duplicates
    const existingEvents = type === 'event' ? await dbSupabase.getEventsSupabase({ status: 'approved' }) : [];
    const existingOpportunities = type === 'opportunity' ? await dbSupabase.getOpportunitiesSupabase({ status: 'approved' }) : [];
    const existingItems = type === 'event' ? existingEvents : existingOpportunities;
    const existingTitles = existingItems?.map((item: any) => item.title.toLowerCase()) || [];

    const eventPrompt = `You are an AI agent helping to find tech events for Ugandan tech community.

SEARCH QUERY: "${query}"

TASK: Use Google Search to find ONE relevant tech event that matches this query. Focus on:
- Events in Uganda or accessible to Ugandans (virtual events welcome)
- Tech-related: meetups, conferences, workshops, hackathons, webinars
- Upcoming events (not past events)
- Events with clear dates and registration info
- Free or affordable events preferred

AVOID these existing events (already in database):
${existingTitles.slice(0, 20).join(', ')}

Return a JSON object with this EXACT structure:
{
  "title": "Event name",
  "description": "Detailed description of the event, agenda, what attendees will learn",
  "type": "meetup|workshop|conference|hackathon|webinar|networking",
  "category": "Web Development|Mobile Development|Data Science|AI/ML|Cybersecurity|Cloud Computing|DevOps|UI/UX Design|Blockchain|IoT|Game Development|Other",
  "startDate": "YYYY-MM-DDTHH:MM:SS" (ISO format),
  "endDate": "YYYY-MM-DDTHH:MM:SS" (ISO format, optional),
  "location": "Venue name and address" (if physical),
  "virtual": true|false,
  "url": "https://..." (registration or event page),
  "organizer": "Organization or person name",
  "capacity": 100 (number, optional),
  "tags": ["tag1", "tag2", "tag3"],
  "relevance": "Why this is relevant for Ugandan tech community"
}

CRITICAL: Return ONLY the JSON object, no other text. Ensure dates are in ISO format and URL is valid.`;

    const opportunityPrompt = `You are an AI agent helping to find opportunities for Ugandan tech professionals and students.

SEARCH QUERY: "${query}"

TASK: Use Google Search to find ONE relevant opportunity that matches this query. Focus on:
- Opportunities for Ugandans or Africans (grants, fellowships, scholarships, competitions)
- Tech-related opportunities
- Open applications (not closed deadlines)
- Clear application process and requirements
- Reputable organizations

AVOID these existing opportunities (already in database):
${existingTitles.slice(0, 20).join(', ')}

Return a JSON object with this EXACT structure:
{
  "title": "Opportunity name",
  "description": "Detailed description of the opportunity, benefits, requirements",
  "type": "grant|fellowship|scholarship|competition|accelerator|incubator",
  "category": "Web Development|Mobile Development|Data Science|AI/ML|Cybersecurity|Cloud Computing|DevOps|UI/UX Design|Blockchain|IoT|Game Development|Other",
  "provider": "Organization providing the opportunity",
  "amount": "10000" (number as string, optional),
  "currency": "USD|UGX|EUR|GBP",
  "deadline": "YYYY-MM-DD" (ISO date format),
  "url": "https://..." (application page),
  "tags": ["tag1", "tag2", "tag3"],
  "relevance": "Why this is relevant for Ugandan tech community"
}

CRITICAL: Return ONLY the JSON object, no other text. Ensure deadline is in YYYY-MM-DD format and URL is valid.`;

    const prompt = type === 'event' ? eventPrompt : opportunityPrompt;

    const config = {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      tools: [{ googleSearch: {} }],
      temperature: 0.7,
    };

    const model = 'gemini-3-flash-preview';

    const contents = [{
      role: 'user',
      parts: [{ text: prompt }],
    }];

    console.log(`🤖 AI Agent searching for ${type}:`, query);
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    let itemData;
    try {
      const text = response.text?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        itemData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        message: 'AI returned invalid data'
      });
    }

    // Check if this item already exists
    const itemKey = getItemKey(itemData.title, itemData.url);
    if (submissionHistory.has(itemKey) || existingTitles.includes(itemData.title.toLowerCase())) {
      return res.json({
        success: false,
        duplicate: true,
        message: `This ${type} already exists`,
        item: itemData
      });
    }

    // Add to history
    submissionHistory.add(itemKey);

    console.log(`✅ AI Agent found ${type}:`, itemData.title);
    res.json({
      success: true,
      type,
      item: itemData,
      query,
      foundAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in AI events agent:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get submission history
router.get('/history', async (req, res) => {
  try {
    const history = Array.from(submissionHistory);
    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Clear history (for testing)
router.post('/clear-history', async (req, res) => {
  try {
    submissionHistory.clear();
    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

export default router;
