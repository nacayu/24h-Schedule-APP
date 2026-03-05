
import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

export const classifyActivity = async (text: string): Promise<Category> => {
  if (!text.trim() || !process.env.API_KEY) return Category.OTHER;
  
  // Initialize AI right before making the call to ensure up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Classify the following daily activity into exactly one of these categories: ${Object.values(Category).join(", ")}. 
      Activity: "${text}"
      Return only the category name in Chinese exactly as provided in the list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "The matched category name from the list"
            }
          },
          required: ["category"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const matchedCategory = Object.values(Category).find(c => c === result.category);
    return matchedCategory || Category.OTHER;
  } catch (error) {
    console.error("Classification error:", error);
    return Category.OTHER;
  }
};

/**
 * Parses raw text into structured task information
 */
export const parseTaskDetails = async (text: string): Promise<{
  title: string;
  description: string;
  startTime?: string;
  endTime?: string;
  category?: Category;
}> => {
  if (!text.trim() || !process.env.API_KEY) return { title: text, description: "" };

  // Initialize AI right before making the call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Parse this activity description into a structured format for a schedule app.
      Input: "${text}"
      
      Instructions:
      1. title: A short concise name for the activity.
      2. description: Break down sub-tasks or metrics (like reps, calories, specific steps). Use a format like "Metric: Value" or "Action: Details". If it's a list, use newlines.
      3. startTime/endTime: If the text mentions times (e.g., "from 10 to 11", "started at 9am"), extract them in HH:mm format. 
      4. category: One of ${Object.values(Category).join(", ")}.

      Example output:
      {
        "title": "Gym Workout",
        "description": "3 x Chin-Up: 19 total reps\\n1 x Farmer walk: 1 total reps",
        "startTime": "08:30",
        "endTime": "09:00",
        "category": "体育健身"
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      ...result,
      category: Object.values(Category).find(c => c === result.category) as Category || Category.OTHER
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return { title: text, description: "" };
  }
};

export const analyzeJournalEntry = async (text: string): Promise<{
  title: string;
  content: string;
  mood: string;
}> => {
  if (!text.trim() || !process.env.API_KEY) return { title: "Today's Record", content: text, mood: "" };

  // Initialize AI right before making the call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this journal entry.
      Input: "${text}"
      
      Instructions:
      1. title: Create a short, engaging, 1-sentence summary/title of the day based on the text (max 10 words). e.g., "今天又是紧张兮兮的一天".
      2. content: The original text, slightly polished if needed (or just keep it as is).
      3. mood: Analyze the sentiment and choose one of these seven traditional Chinese emotions: 喜, 怒, 忧, 思, 悲, 恐, 惊.

      Output JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            mood: { type: Type.STRING, description: "One of the Chinese emotion characters: 喜, 怒, 忧, 思, 悲, 恐, 惊" }
          },
          required: ["title", "content", "mood"]
        }
      }
    });
    
    const result = JSON.parse(response.text || "{}");
    return {
      title: result.title || "Today's Record",
      content: result.content || text,
      mood: result.mood || ""
    };
  } catch (error) {
    console.error("Journal analysis error:", error);
    return { title: "Today's Record", content: text, mood: "" };
  }
}
