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

function getJobKey(title: string, company: string): string {
  return `${title.toLowerCase().trim()}-${company.toLowerCase().trim()}`;
}

// Search and auto-fill job
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

    // Fetch existing jobs to avoid duplicates
    const existingJobs = await dbSupabase.getJobsSupabase({ status: 'approved' });
    const existingTitles = existingJobs?.map((job: any) => `${job.title} at ${job.company}`.toLowerCase()) || [];

    const prompt = `You are an AI agent helping to find tech job opportunities for Ugandan tech professionals.

SEARCH QUERY: "${query}"

TASK: Use Google Search to find ONE relevant tech job that matches this query. Focus on:
- Jobs in Uganda or remote jobs accessible to Ugandans
- Tech-related positions (software, data, design, etc.)
- Active job postings (not closed)
- Clear application process
- Reputable companies

AVOID these existing jobs (already in database):
${existingTitles.slice(0, 20).join(', ')}

Return a JSON object with this EXACT structure:
{
  "title": "Job title (e.g., Senior Software Engineer)",
  "company": "Company name",
  "description": "Detailed job description, what the role involves",
  "requirements": "Required skills, qualifications, experience",
  "responsibilities": "Key responsibilities and duties",
  "type": "full-time|part-time|internship|contract",
  "location": "City, Country (or 'Remote')",
  "remote": true|false,
  "experienceLevel": "Entry Level|Mid-Level|Senior|Lead",
  "salaryMin": "50000" (number as string, optional),
  "salaryMax": "100000" (number as string, optional),
  "currency": "UGX|USD|EUR|GBP",
  "applicationUrl": "https://..." (application page),
  "applicationEmail": "jobs@company.com" (optional),
  "expiresAt": "YYYY-MM-DD" (deadline, optional),
  "relevance": "Why this is relevant for Ugandan tech professionals"
}

CRITICAL: Return ONLY the JSON object, no other text. Ensure URLs are valid.`;

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

    console.log('🤖 AI Agent searching for job:', query);
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    let jobData;
    try {
      const text = response.text?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jobData = JSON.parse(jsonMatch[0]);
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

    // Check if this job already exists
    const jobKey = getJobKey(jobData.title, jobData.company);
    const existingKey = `${jobData.title} at ${jobData.company}`.toLowerCase();
    
    if (submissionHistory.has(jobKey) || existingTitles.includes(existingKey)) {
      return res.json({
        success: false,
        duplicate: true,
        message: 'This job already exists',
        job: jobData
      });
    }

    // Add to history
    submissionHistory.add(jobKey);

    console.log('✅ AI Agent found job:', jobData.title, 'at', jobData.company);
    res.json({
      success: true,
      job: jobData,
      query,
      foundAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in AI jobs agent:', error);
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
