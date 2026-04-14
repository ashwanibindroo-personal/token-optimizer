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
    "please help me": "help",
    "please ": "",
    "thank you": "",
    "thanks in advance": "",
    "i appreciate it": "",
    "in order to": "to",
    "at this point in time": "now",
    "due to the fact that": "because",
    "for the purpose of": "for",
    "with regard to": "about",
    "with respect to": "about",
    "as a matter of fact": "",
    "it is important to note that": "note:",
    "it should be noted that": "note:",
    "in the event that": "if",
    "at the end of the day": "ultimately",
    "provide me with a summary of this document": "summarize",
    "provide me with a summary of this text": "summarize",
    "provide me with a summary of this": "summarize",
    "provide me with a summary of the following": "summarize",
    "provide me with a summary of": "summarize",
    "provide a summary of this document": "summarize",
    "provide a summary of this text": "summarize",
    "provide a summary of this": "summarize",
    "provide a summary of the following": "summarize",
    "provide a summary of": "summarize",
    "give me a summary of this document": "summarize",
    "give me a summary of this text": "summarize",
    "give me a summary of this": "summarize",
    "give me a summary of the following": "summarize",
    "give me a summary of": "summarize",
    "give a summary of this document": "summarize",
    "give a summary of this text": "summarize",
    "give a summary of this": "summarize",
    "give a summary of the following": "summarize",
    "give a summary of": "summarize",
    "write a summary of this document": "summarize",
    "write a summary of this text": "summarize",
    "write a summary of this": "summarize",
    "write a summary of the following": "summarize",
    "write a summary of": "summarize",
    "write me a summary of this document": "summarize",
    "write me a summary of this text": "summarize",
    "write me a summary of this": "summarize",
    "write me a summary of the following": "summarize",
    "write me a summary of": "summarize",
    "provide me with": "give",
    "make sure to": "",
    "be sure to": "",
    "a wide range of": "many",
    "a large number of": "many",
    "a lot of": "many",
    "each and every": "every",
    "first and foremost": "first",
    "basically": "",
    "essentially": "",
    "actually": "",
    "honestly": "",
    "literally": "",
    "very ": "",
    "really ": "",
    "just ": "",
    "simply ": "",
    "that being said": "",
    "having said that": "",
    "could you help me with": "help with",
    "i am looking for": "find",
    "i'm looking for": "find",
    "i need you to": "",
    "i'd like you to": "",
    "based on the fact that": "since",
    "it seems that": "",
    "it appears that": "",
    "there is a need for": "need",
    "take into consideration": "consider",
    "take into account": "consider",
    "to be honest": "",
    "to be frank": "",
    "kindly": "",
    "without further ado": "",
    "it's worth noting that": "note:",
    "it is worth mentioning that": "note:",
    "as soon as possible": "ASAP",
    "in the near future": "soon",
    "at the present time": "now",
    "on a daily basis": "daily",
    "in my opinion": "",
    "i think that": "",
    "i believe that": "",
    "as you know": "",
    "as we all know": "",
    "the fact of the matter is": "",
    "in this day and age": "today",
    "needless to say": "",
    "it goes without saying": "",
    "when it comes to": "for",
    "in terms of": "for",
    "is able to": "can",
    "has the ability to": "can",
    "in the process of": "",
    "on the other hand": "alternatively",
    "by means of": "via",
    "in spite of the fact that": "despite",
    "for the most part": "mostly"
  },

  /**
   * Estimates token count. Uses character-based heuristic:
   * ~4 characters per token for English (GPT/Claude/Gemini average).
   */
  estimateTokens(text) {
    if (!text || !text.trim()) return 0;
    return Math.ceil(text.length / 4);
  },

  /**
   * Generates an optimized version of the text
   */
  optimize(text) {
    if (!text) return text;
    let optimized = text;
    
    // 1. Remove fluff/filler phrases
    for (const [key, replacement] of Object.entries(this.replacements)) {
      const regex = new RegExp(key, "gi");
      optimized = optimized.replace(regex, replacement);
    }

    // 2. Collapse multiple spaces, newlines, and trim
    optimized = optimized.replace(/[ \t]+/g, " ");
    optimized = optimized.replace(/\n{3,}/g, "\n\n");
    optimized = optimized.trim();

    // 3. Remove leading/trailing spaces on each line
    optimized = optimized.split("\n").map(line => line.trim()).join("\n");

    return optimized;
  },

  /**
   * Returns a list of specific recommendations
   */
  getRecommendations(text) {
    const recommendations = [];
    if (!text) return recommendations;

    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("please") || lowerText.includes("could you") || lowerText.includes("kindly")) {
      recommendations.push("Remove politeness markers (Please/Could you/Kindly) — saves 2-5 tokens.");
    }
    
    if (text.length > 500) {
      recommendations.push("Use bullet points instead of paragraphs for long prompts.");
    }

    if (text.length > 200 && !/\n/.test(text)) {
      recommendations.push("Break into multiple sentences for better clarity and fewer tokens.");
    }

    const fillerCount = Object.keys(this.replacements).filter(key => lowerText.includes(key)).length;
    if (fillerCount > 0) {
      recommendations.push(`Found ${fillerCount} wordy phrase${fillerCount > 1 ? 's' : ''} that can be simplified.`);
    }

    if (/\s{2,}/.test(text)) {
      recommendations.push("Remove extra whitespace to trim token usage.");
    }

    return recommendations;
  }
};

// Export for use in content.js
window.TokenOptimizer = Optimizer;
