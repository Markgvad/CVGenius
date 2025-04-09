// services/cv/dataExtractionService.js
const fetch = require('node-fetch');
const logger = require('../../utils/logger');
const mcpClient = require('../mcp/mcpClient');

let mcp = null;

/**
 * Initialize MCP client if it's available
 */
async function initializeMCP() {
  try {
    // Only initialize if MCP is enabled via environment variable
    if (process.env.USE_MCP === 'true') {
      mcp = await mcpClient.initializeMCPClient();
      logger.info('MCP client initialized for data extraction service');
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to initialize MCP client, falling back to API:', error);
    return false;
  }
}

// Initialize MCP when module is loaded
initializeMCP().catch(error => {
  logger.error('Error during MCP initialization:', error);
});

/**
 * Extracts structured data from CV text using Claude AI
 * @param {String} extractedText - The raw text extracted from the CV
 * @param {String} claudeApiKey - The Claude API key
 * @param {String} claudeModel - The Claude model to use
 * @returns {Promise<Object>} - The structured CV data
 */
exports.extractStructuredData = async (extractedText, claudeApiKey, claudeModel) => {
  try {
    logger.info('Starting CV data extraction with Claude');
    
    // Prepare the extraction prompt
    const extractionPrompt = `Extract all relevant information from this CV/resume and format it as a structured JSON object that matches the following schema. Be comprehensive and extract as much detail as possible while maintaining accuracy:

{
  "language": "", // The language of the CV (e.g., "english", "danish", "french", etc.)
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
      "name": "", // e.g., "Technical Skills", "Soft Skills", etc. - Use terms in the CV's language
      "icon": "", // Suggest appropriate Font Awesome icon class
      "skills": [
        {
          "name": "",
          "level": "" // Use terminology in the CV's language (e.g., "Begynder", "Grundlæggende" for Danish)
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
      "proficiency": "" // Use appropriate terms in the CV's original language (e.g., "Grundlæggende", "Øvet", "Flydende" for Danish)
    }
  ]
}

IMPORTANT GUIDELINES:
1. DETECT THE LANGUAGE OF THE CV ACCURATELY. For example, if it's in Danish, set language: "danish", if in English, set language: "english", etc.
2. KEEP ALL TEXT IN THE ORIGINAL LANGUAGE OF THE CV. Do not translate anything to English.
3. For example, if the CV is in Danish:
   - Keep all job titles, company names, education details, etc. in Danish
   - Category names should remain in Danish (e.g., "Tekniske Færdigheder" instead of "Technical Skills")
   - The profile text should remain in Danish
   - All achievement titles and descriptions should remain in Danish
   - Personal info fields including name, title, location MUST stay in Danish
4. CRITICAL: You MUST include the personalInfo section with ALL its fields (even if empty). The personalInfo section MUST BE A PROPERLY NESTED OBJECT with these fields:
   - name
   - title
   - email
   - phone
   - linkedin
   - location
5. The personalInfo section MUST look like this:
   "personalInfo": {
     "name": "John Doe",
     "title": "Software Engineer",
     "email": "john@example.com",
     "phone": "+45 12345678",
     "linkedin": "linkedin.com/in/johndoe",
     "location": "Copenhagen, Denmark"
   }
6. DO NOT structure it incorrectly like this:
   "language": "danish",
   "name": "John Doe",
   "title": "Software Engineer"
   
   Instead, ALWAYS use proper nesting of the personalInfo section.
7. TRY VERY HARD to extract the name, title, and other personal info fields from the CV. Search for:
   - Name at the top of the CV
   - Professional title/position
   - Contact details like email, phone
   - LinkedIn profile URL
   - City/location information
8. YOU MUST include the profile section as a string, even if it's empty:
   "profile": "Professional software developer with 5 years of experience..."
9. YOU MUST include all array sections, even if empty:
   "metrics": [],
   "experience": [],
   "skills": [],
   "education": [],
   "languages": []

10. IMPORTANT: For language proficiency levels, use terms in the CV's language:
   - For Danish CVs: "Grundlæggende", "Samtale niveau", "Rutineret", "Flydende", "Modersmål"
   - For English CVs: "Basic", "Conversational", "Proficient", "Fluent", "Native"
   - For Spanish CVs: "Básico", "Conversacional", "Competente", "Fluido", "Nativo"
   - For French CVs: "Élémentaire", "Conversation", "Intermédiaire", "Courant", "Langue maternelle"
   - For German CVs: "Grundkenntnisse", "Konversationsniveau", "Fortgeschritten", "Fließend", "Muttersprache"

11. IMPORTANT: For skill levels, use terms in the CV's language:
   - For Danish CVs: "Begynder", "Grundlæggende", "Øvet", "Avanceret", "Ekspert"
   - For English CVs: "Beginner", "Basic", "Intermediate", "Advanced", "Expert"
   - For Spanish CVs: "Principiante", "Básico", "Intermedio", "Avanzado", "Experto"
   - For French CVs: "Débutant", "Élémentaire", "Intermédiaire", "Avancé", "Expert"
   - For German CVs: "Anfänger", "Grundkenntnisse", "Mittelstufe", "Fortgeschritten", "Experte"

12. If no profile/summary section is present in the CV, CREATE ONE based on the rest of the information:
    - Write a short professional summary (3-5 sentences)
    - Mention key skills, experience level, industries, and professional goals
    - Match the tone and language style of the rest of the CV
    - Write it in the SAME LANGUAGE as the CV
    
    For example, if it's a Danish CV, write a profile like:
    "Erfaren softwareudvikler med over 5 års erfaring inden for webudvikling. Specialist i JavaScript, React og Node.js med fokus på at skabe brugervenlige og skalerbare løsninger. Har arbejdet med agile teams i både startup- og enterprise-miljøer."
    
    NOT in English like:
    "Experienced software developer with over 5 years in web development..."

13. ALWAYS GENERATE 4 key metrics for the CV based on the person's experience:
    - Identify relevant achievements and quantifiable results from their career
    - Use numbers that highlight their experience and accomplishments
    - Make sure all text is in the same language as the CV
    - Choose metrics that best showcase the person's professional strengths
    
    Example metrics for Danish CV:
    {
      "metrics": [
        {
          "icon": "fas fa-history",
          "value": "7",
          "suffix": "+",
          "label": "Års erfaring"
        },
        {
          "icon": "fas fa-project-diagram",
          "value": "15",
          "suffix": "+",
          "label": "Projekter gennemført"
        },
        {
          "icon": "fas fa-users",
          "value": "8",
          "suffix": "",
          "label": "Team ledet"
        },
        {
          "icon": "fas fa-certificate",
          "value": "5",
          "suffix": "",
          "label": "Certificeringer"
        }
      ]
    }
    
    Example metrics for English CV:
    {
      "metrics": [
        {
          "icon": "fas fa-history",
          "value": "7",
          "suffix": "+",
          "label": "Years experience"
        },
        {
          "icon": "fas fa-project-diagram",
          "value": "15",
          "suffix": "+",
          "label": "Projects completed"
        },
        {
          "icon": "fas fa-users",
          "value": "8",
          "suffix": "",
          "label": "Teams led"
        },
        {
          "icon": "fas fa-certificate",
          "value": "5",
          "suffix": "",
          "label": "Certifications"
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
   - DO NOT include any icons or special characters at the beginning of achievement titles
   - Achievement descriptions must be detailed (2-4 lines) explaining the context, approach, and results
   - Convert bullet points from the original CV into properly structured achievements
4. Categorize skills appropriately (e.g., Programming Languages, Tools, Soft Skills)
5. Format dates consistently (e.g., "Jan 2020" for experience, "2020" for education)

For example, transform a job bullet point like "Led team of 5 developers to redesign the company website, resulting in 40% increase in user engagement" into:
- Title: "Website Redesign resulting in 40% increased engagement"
- Description: "Directed a team of 5 developers through complete website redesign process. Implemented new UX practices and optimized site performance. The project resulted in a 40% increase in user engagement metrics and received positive executive feedback."

If certain sections are ambiguous, make your best assessment based on context and common CV conventions.

Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.`;

    let jsonStr = '';
    
    if (mcp && process.env.USE_MCP === 'true') {
      // Use MCP to extract data
      logger.info('Using MCP for CV data extraction');
      
      const response = await mcpClient.sendModelRequest(mcp, {
        model: claudeModel || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
        prompt: extractionPrompt,
        max_tokens: 50000,
        temperature: 0
      });
      
      if (!response || !response.content) {
        throw new Error('Empty response from model via MCP');
      }
      
      jsonStr = response.content;
    } else {
      // Fallback to direct API call
      logger.info('Using direct API call for CV data extraction');
      
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
              content: extractionPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API error: ${errorData.error?.message || JSON.stringify(errorData)}`);
      }

      const responseData = await response.json();
      
      // Get text from response
      if (responseData.content && responseData.content.length > 0) {
        jsonStr = responseData.content[0].text;
      } else {
        throw new Error('Empty response from Claude API');
      }
    }
    
    // Try to extract JSON if wrapped in code blocks
    const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || 
                    jsonStr.match(/```\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Parse the JSON
    const parsedData = safeJSONParse(jsonStr);
    logger.info('CV data extraction completed successfully');
    return parsedData;
  } catch (error) {
    logger.error('Error in structured data extraction:', error);
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
    logger.warn('Initial JSON parse failed, attempting to fix common issues...');
    
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
        logger.error('All JSON parse attempts failed');
        logger.error('JSON string excerpt (first 200 chars):', jsonString.substring(0, 200));
        
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