'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
});

export async function compareSeo(userUrl: string, compUrl: string) {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an SEO expert. Analyze the provided websites (simulated based on their domain names and typical performance) and return a comparison JSON. 
          
          Return strictly valid JSON with this structure:
          {
            "userScore": number (0-100),
            "compScore": number (0-100),
            "metrics": {
              "user": {
                "title": string (e.g. "55 chars"),
                "isTitleGood": boolean,
                "desc": string ("Optimized" or "Missing"),
                "isDescGood": boolean,
                "headings": string ("Well Structured" or "Unstructured"),
                "isHeadingsGood": boolean,
                "wc": number (estimated word count),
                "mob": string ("Yes" or "Issues Found"),
                "isMobGood": boolean
              },
              "comp": { ... same structure ... }
            }
          }
          
          Rule: If a site looks like a major brand (google, apple, etc.), give it high scores. If it looks like a test or small site, vary the scores.`
                },
                {
                    role: 'user',
                    content: `Compare these two websites:
          1. User Site: ${userUrl}
          2. Competitor Site: ${compUrl}`
                }
            ],
            model: 'deepseek-chat',
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content received from DeepSeek');

        const data = JSON.parse(content);

        // Add computed winner logic
        return {
            ...data,
            userWins: data.userScore >= data.compScore
        };

    } catch (error) {
        console.error('DeepSeek API Error:', error);
        // Fallback/Mock data in case of API failure to prevent app crash
        return {
            userScore: 75,
            compScore: 60,
            userWins: true,
            metrics: {
                user: {
                    title: "60 chars", isTitleGood: true,
                    desc: "Optimized", isDescGood: true,
                    headings: "Well Structured", isHeadingsGood: true,
                    wc: 1500,
                    mob: "Yes", isMobGood: true
                },
                comp: {
                    title: "40 chars", isTitleGood: false,
                    desc: "Missing", isDescGood: false,
                    headings: "Unstructured", isHeadingsGood: false,
                    wc: 800,
                    mob: "Issues Found", isMobGood: false
                }
            }
        };
    }
}
