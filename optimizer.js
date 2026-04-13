/**
 * Token Optimizer Logic
 * Provides heuristics for reducing token count in LLM prompts.
 */

const Optimizer = {
  // Common fluffy phrases and their concise replacements
  replacements: {
    "i would like you to": "",
    "can you please": "",
    "could you please": "",
    "i want you to": "",
    "please ": "",
    "thank you": "",
    "i appreciate it": "",
    "in order to": "to",
    "at this point in time": "now",
    "due to the fact that": "because",
    "for the purpose of": "for",
    "with regard to": "about",
    "as a matter of fact": "actually",
    "it is important to note that": "note:",
    "in the event that": "if",
    "at the end of the day": "ultimately",
    "provide me with": "give",
    "summarize the following": "summarize",
    "a wide range of": "many",
    "each and every": "every",
    "basically": "",
    "actually": "",
    "very ": "",
    "really ": ""
  },

  /**
   * Estimates token count based on typical LLM tokenization (1 token ≈ 4 characters)
   * This is a close approximation for GPT-4, Claude, and Gemini.
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Standard rule: words * 1.3 is a safe estimate for English
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.35);
  },

  /**
   * Generates an optimized version of the text
   */
  optimize(text) {
    let optimized = text;
    
    // 1. Remove fluff/filler phrases
    for (const [key, replacement] of Object.entries(this.replacements)) {
      const regex = new RegExp(key, "gi");
      optimized = optimized.replace(regex, replacement);
    }

    // 2. Remove multiple spaces and trim
    optimized = optimized.replace(/\s+/g, " ").trim();

    return optimized;
  },

  /**
   * Returns a list of specific recommendations
   */
  getRecommendations(text) {
    const recommendations = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("please") || lowerText.includes("could you")) {
      recommendations.push("Remove politeness markers (Please/Could you) to save 2-4 tokens.");
    }
    
    if (text.length > 500) {
      recommendations.push("Consider using bullet points for large blocks of text.");
    }

    const fillerCount = Object.keys(this.replacements).filter(key => lowerText.includes(key)).length;
    if (fillerCount > 0) {
      recommendations.push(`Found ${fillerCount} wordy phrases that can be simplified.`);
    }

    return recommendations;
  }
};

// Export for use in content.js
window.TokenOptimizer = Optimizer;
