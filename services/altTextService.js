// services/altTextService.js
class AltTextService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
    this.model = "gpt-4o-mini"; // Using GPT-4o-mini for vision capabilities
  }

  async generateAltText(imageUrl, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const {
        context = '',
        tone = 'descriptive',
        maxLength = 125,
        includeDetails = true
      } = options;

      const systemPrompt = this.buildSystemPrompt(tone, maxLength, includeDetails);
      const userPrompt = this.buildUserPrompt(context);

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high"
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error('Invalid response from OpenAI API');
      }

      const altText = data.choices[0].message.content.trim();
      
      // Remove quotes if present
      return altText.replace(/^["']|["']$/g, '');
    } catch (err) {
      console.error("AltTextService error:", err);
      throw err;
    }
  }

  buildSystemPrompt(tone, maxLength, includeDetails) {
    const basePrompt = `You are an accessibility expert specializing in creating effective alt text for images. Your alt text should be:

1. Concise but descriptive (aim for ${maxLength} characters or less)
2. Focused on the essential information
3. Written in a ${tone} tone
4. Accessible and helpful for screen reader users
5. Without phrases like "image of" or "picture of"`;

    const detailsPrompt = includeDetails 
      ? "\n6. Include relevant details like colors, emotions, actions, and context"
      : "\n6. Focus on the main subject without excessive details";

    return basePrompt + detailsPrompt;
  }

  buildUserPrompt(context) {
    let prompt = "Analyze this image and provide appropriate alt text.";
    
    if (context) {
      prompt += ` Context: ${context}`;
    }
    
    prompt += "\n\nProvide ONLY the alt text, without any explanations or quotes.";
    
    return prompt;
  }

  // Batch processing for multiple images
  async generateBatchAltText(images, options = {}) {
    const results = [];
    
    for (const image of images) {
      try {
        const altText = await this.generateAltText(image.url, {
          ...options,
          context: image.context || options.context
        });
        
        results.push({
          success: true,
          fileName: image.fileName,
          url: image.url,
          altText: altText
        });
      } catch (error) {
        results.push({
          success: false,
          fileName: image.fileName,
          url: image.url,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Validate image URL
  isValidImageUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

module.exports = new AltTextService();