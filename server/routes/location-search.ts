import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import * as dbSupabase from '../db-supabase.js';

const router = Router();

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  return new GoogleGenAI({ apiKey });
};

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

router.post('/', async (req, res) => {
  try {
    const { query, latitude, longitude } = req.body;

    if (!query || !latitude || !longitude) {
      return res.status(400).json({ error: 'Query and location required' });
    }

    // Fetch all entities using Supabase client (same as dashboard)
    const [hubs, startups, events, communities] = await Promise.all([
      dbSupabase.getHubsSupabase({ status: 'approved' }),
      dbSupabase.getStartupsSupabase({ status: 'approved' }),
      dbSupabase.getEventsSupabase({ status: 'approved' }),
      dbSupabase.getCommunitiesSupabase({ status: 'approved' })
    ]);

    const allEntities = [
      ...(hubs || []).filter((h: any) => h.location).map((h: any) => ({ ...h, type: 'hub' })),
      ...(startups || []).filter((s: any) => s.location).map((s: any) => ({ ...s, type: 'startup' })),
      ...(events || []).filter((e: any) => e.location).map((e: any) => ({ ...e, type: 'event' })),
      ...(communities || []).filter((c: any) => c.location).map((c: any) => ({ ...c, type: 'community' })),
    ];

    // Use Gemini AI with Google Maps grounding to find relevant results
    let ai;
    try {
      ai = getGeminiClient();
    } catch (error) {
      // Fallback to simple text matching if AI not available
      const filtered = allEntities.filter((entity: any) => 
        entity.name?.toLowerCase().includes(query.toLowerCase()) ||
        entity.description?.toLowerCase().includes(query.toLowerCase()) ||
        entity.location?.toLowerCase().includes(query.toLowerCase())
      );

      return res.json({
        success: true,
        results: filtered.slice(0, 10).map((entity: any) => ({
          name: entity.name,
          type: entity.type,
          location: entity.location,
          description: entity.description
        })),
        aiUsed: false
      });
    }

    // Create context for AI
    const entitiesContext = allEntities.map((e: any) => 
      `${e.type.toUpperCase()}: ${e.name} - ${e.location} - ${e.description || 'No description'}`
    ).join('\n');

    const prompt = `You are helping someone find tech ecosystem resources near their location in Uganda.

User's location: Latitude ${latitude}, Longitude ${longitude}
User is looking for: "${query}"

Available resources in Uganda:
${entitiesContext}

Based on the user's query, identify the most relevant resources. Consider:
1. What type of resource they're looking for (hub, startup, event, community)
2. Keywords in their query
3. Relevance to their needs

Return a JSON array of the top 5-10 most relevant results with this structure:
[
  {
    "name": "Resource name",
    "type": "hub|startup|event|community",
    "location": "Location",
    "relevance": "Brief explanation why this matches"
  }
]

Return ONLY the JSON array, no other text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let aiResults = [];
    try {
      const text = response.text?.trim() || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiResults = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // Match AI results with actual entities and add distance
    const results = aiResults.map((aiResult: any) => {
      const entity = allEntities.find((e: any) => 
        e.name?.toLowerCase() === aiResult.name?.toLowerCase()
      );
      
      if (entity) {
        return {
          name: entity.name,
          type: entity.type,
          location: entity.location,
          description: entity.description,
          relevance: aiResult.relevance,
          distance: 'Location-based distance coming soon'
        };
      }
      return null;
    }).filter(Boolean);

    res.json({
      success: true,
      results,
      aiUsed: true,
      query,
      userLocation: { latitude, longitude }
    });

  } catch (error) {
    console.error('Error in location search:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
