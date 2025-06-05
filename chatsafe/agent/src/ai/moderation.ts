import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config({ path: '../../.env' }); // Adjust path to root .env if needed

const openAiApiKey = process.env.OPENAI_API_KEY;

if (!openAiApiKey) {
  console.error("OPENAI_API_KEY is not set in the .env file for the agent.");
  // Decide if this is a fatal error for the agent's operation
  // For now, we'll let it run but moderation will fail.
}

// Initialize OpenAI client only if the key is available
let openai: OpenAIApi | null = null;
if (openAiApiKey) {
  try {
    const config = new Configuration({ apiKey: openAiApiKey });
    openai = new OpenAIApi(config);
  } catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
    openai = null; // Ensure openai is null if initialization fails
  }
} else {
   console.warn("OpenAI API key not found. AI moderation will be skipped.");
}

export async function runModeration(content: string): Promise<{ flagged: boolean; reason: string, categories?: any }> {
  if (!openai) {
    console.warn("OpenAI client not initialized. Skipping moderation.");
    return { flagged: false, reason: "OpenAI client not initialized" };
  }
  
  if (!content || content.trim() === "") {
    return { flagged: false, reason: "Empty content" };
  }

  try {
    const resp = await openai.createModeration({ input: content });
    const result = resp.data.results[0];

    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, val]) => val === true) // Ensure only true values are considered
        .map(([cat]) => cat);
      
      // More detailed reason including scores if needed, or just categories
      const reason = flaggedCategories.join(", ");
      
      return { flagged: true, reason: reason || "General policy violation", categories: result.categories };
    }

    return { flagged: false, reason: "", categories: result.categories };
  } catch (error: any) {
    console.error("Error during OpenAI moderation request:", error.message);
    // Check for specific OpenAI errors if necessary
    if (error.response) {
      console.error("OpenAI API Error Details:", error.response.data);
    }
    return { flagged: false, reason: `Moderation API error: ${error.message}` };
  }
}
