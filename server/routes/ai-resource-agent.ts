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

// In-memory history to avoid duplicates (in production, use database)
const submissionHistory = new Set<string>();

// Generate a unique key for a resource
function getResourceKey(title: string, url: string): string {
  return `${title.toLowerCase().trim()}-${url.toLowerCase().trim()}`;
}

// Search and auto-fill learning resource
router.post('/search-and-fill', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
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

    // Fetch existing resources to avoid duplicates
    const existingResources = await dbSupabase.getLearningResourcesSupabase({ status: 'approved' });
    const existingTitles = existingResources?.map((r: any) => r.title.toLowerCase()) || [];
    const existingUrls = existingResources?.map((r: any) => r.url?.toLowerCase()).filter(Boolean) || [];

    const prompt = `You are an AI agent helping to find learning resources for Ugandan tech learners.

SEARCH QUERY: "${query}"

TASK: Use Google Search to find ONE high-quality learning resource that matches this query. Focus on:
- Free or affordable resources
- Resources where Ugandans can participate
- Courses, tutorials, bootcamps, or educational content
- Tech-related learning opportunities
- Resources with clear URLs and descriptions

AVOID these existing resources (already in database):
${existingTitles.slice(0, 20).join(', ')}

Return a JSON object with this EXACT structure:
{
  "title": "Resource title",
  "description": "Detailed description of what this resource covers and who it's for",
  "type": "Course|Tutorial|Book|Video|Bootcamp|Workshop",
  "category": "Web Development|Mobile Development|Data Science|AI/ML|Cybersecurity|Cloud Computing|DevOps|UI/UX Design|Blockchain|IoT|Game Development|Other",
  "level": "beginner|intermediate|advanced",
  "provider": "Provider or author name",
  "url": "https://...",
  "cost": "free|paid|freemium",
  "duration": "e.g., 6 weeks, 20 hours, Self-paced",
  "tags": ["tag1", "tag2", "tag3"],
  "relevance": "Why this is relevant for Ugandan learners"
}

CRITICAL: Return ONLY the JSON object, no other text. Ensure the URL is valid and accessible.`;

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

    console.log('🤖 AI Agent searching for:', query);
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    let resourceData;
    try {
      const text = response.text?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resourceData = JSON.parse(jsonMatch[0]);
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

    // Check if this resource already exists
    const resourceKey = getResourceKey(resourceData.title, resourceData.url);
    if (submissionHistory.has(resourceKey) || 
        existingTitles.includes(resourceData.title.toLowerCase()) ||
        existingUrls.includes(resourceData.url?.toLowerCase())) {
      return res.json({
        success: false,
        duplicate: true,
        message: 'This resource already exists',
        resource: resourceData
      });
    }

    // Add to history
    submissionHistory.add(resourceKey);

    console.log('✅ AI Agent found resource:', resourceData.title);
    res.json({
      success: true,
      resource: resourceData,
      query,
      foundAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in AI resource agent:', error);
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
