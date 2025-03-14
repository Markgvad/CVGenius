// services/dataExtractionService.js
const fetch = require('node-fetch');

/**
 * Extracts structured data from CV text using Claude API
 * @param {String} extractedText - The raw text extracted from the CV
 * @param {String} claudeApiKey - The Claude API key
 * @param {String} claudeModel - The Claude model to use
 * @returns {Promise<Object>} - The structured CV data
 */
exports.extractStructuredData = async (extractedText, claudeApiKey, claudeModel) => {
  try {
    console.log('Sending extracted text to Claude for data extraction...');

    // Direct API call to Claude with extraction prompt
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: claudeModel || "claude-3-7-sonnet-20250219",
        max_tokens: 50000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Extract all relevant information from this CV/resume and format it as a structured JSON object that matches the following schema. Be comprehensive and extract as much detail as possible while maintaining accuracy:

{
  "personalInfo": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "linkedin": "",
    "location": ""
  },
  "profile": "",
  "metrics": [
    {
      "icon": "",  // Suggest appropriate Font Awesome icon class (e.g., "fas fa-users")
      "value": "", // Numerical value
      "suffix": "", // Optional suffix like "+" or "%"
      "label": ""  // Description of the metric
    }
  ],
  "experience": [
    {
      "title": "",
      "company": "",
      "startDate": "",
      "endDate": "",
      "achievements": [
        {
          "title": "",  // IMPORTANT: Keep this concise (1 line only) - this is shown initially
          "description": ""  // IMPORTANT: This should be detailed (2-4 lines) as it's revealed on interaction
        }
      ]
    }
  ],
  "skills": [
    {
      "name": "", // e.g., "Technical Skills", "Soft Skills", etc.
      "icon": "", // Suggest appropriate Font Awesome icon class
      "skills": [
        {
          "name": "",
          "level": "" // Must be one of: "Beginner", "Basic", "Intermediate", "Advanced", "Expert"
        }
      ]
    }
  ],
  "education": [
    {
      "degree": "",
      "institution": "",
      "startYear": "",
      "endYear": ""
    }
  ],
  "languages": [
    {
      "name": "",
      "proficiency": "" // Must be one of: "Basic", "Conversational", "Proficient", "Fluent", "Native"
    }
  ]
}

Here's the CV text to extract information from:

${extractedText}

Important guidelines:
1. For missing information, use empty strings rather than omitting fields
2. Make reasonable inferences about skill levels and language proficiencies based on context
3. For achievements under each job experience:
   - Create multiple specific achievement entries for each position
   - Achievement titles must be concise (1 line only), capturing the key accomplishment, and ideally convey as much information as possible, such as numbers if applicable. Ideally 5-9 words.
   - Achievement descriptions must be detailed (2-4 lines) explaining the context, approach, and results
   - Convert bullet points from the original CV into properly structured achievements
4. Categorize skills appropriately (e.g., Programming Languages, Tools, Soft Skills)
5. Format dates consistently (e.g., "Jan 2020" for experience, "2020" for education)

For example, transform a job bullet point like "Led team of 5 developers to redesign the company website, resulting in 40% increase in user engagement" into:
- Title: "Website Redesign resulting in 40% increased engagement"
- Description: "Directed a team of 5 developers through complete website redesign process. Implemented new UX practices and optimized site performance. The project resulted in a 40% increase in user engagement metrics and received positive executive feedback."

If certain sections are ambiguous, make your best assessment based on context and common CV conventions.

Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    console.log('Claude API response received');
    
    // Get text from response
    let jsonStr = '';
    if (responseData.content && responseData.content.length > 0) {
      jsonStr = responseData.content[0].text;
    } else {
      throw new Error('Empty response from Claude API');
    }
    
    // Try to extract JSON if wrapped in code blocks
    const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || 
                    jsonStr.match(/```\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Parse the JSON
    return safeJSONParse(jsonStr);
  } catch (error) {
    console.error('Error in structured data extraction:', error);
    throw error;
  }
};

/**
 * Safe JSON parsing with error handling
 * @param {String} jsonString - The JSON string to parse
 * @returns {Object} - The parsed JSON object
 */
function safeJSONParse(jsonString) {
  try {
    // First attempt: direct parsing
    return JSON.parse(jsonString);
  } catch (initialError) {
    console.log('Initial JSON parse failed, attempting to fix common issues...');
    
    try {
      // Try to fix unterminated strings by replacing problematic sequences
      const fixedString = jsonString
        // Replace any unescaped quotes in strings
        .replace(/([^\\])(")([^,:}\]]*?)([^\\])(")(?=[^"]*[,:}\]])/g, '$1$2$3$4\\$5')
        // Fix any missing quotes at end of properties
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
      
      return JSON.parse(fixedString);
    } catch (fixAttemptError) {
      // If still fails, try a more aggressive approach
      try {
        // Find what looks like the main JSON object (between first { and last })
        const match = jsonString.match(/({[\s\S]*})/);
        if (match) {
          return JSON.parse(match[1]);
        }
      } catch (lastAttemptError) {
        // If all else fails, use a minimal fallback structure
        console.error('All JSON parse attempts failed');
        console.error('JSON string excerpt (first 200 chars):', jsonString.substring(0, 200));
        
        return {
          personalInfo: {
            name: "Parsing Error",
            title: "Please try again",
            email: "",
            phone: "",
            linkedin: "",
            location: ""
          },
          profile: "There was an error parsing the CV data. Please try uploading again.",
          experience: [],
          skills: [],
          education: [],
          languages: []
        };
      }
    }
  }
}