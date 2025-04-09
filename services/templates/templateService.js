// services/templates/templateService.js
const fetch = require('node-fetch');
const htmlTemplate = require('./htmlTemplate');
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
      logger.info('MCP client initialized for template service');
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
 * Generates HTML for a CV using Claude AI
 * @param {Object} cv - The CV object with structured data
 * @param {String} claudeApiKey - The Claude API key
 * @param {String} claudeModel - The Claude model to use
 * @returns {Promise<String>} - The generated HTML
 */
// Track in-progress HTML generations to avoid duplicates
const inProgressGenerations = new Map();

exports.generateCvHtml = async (cv, claudeApiKey, claudeModel) => {
  try {
    const cvId = cv.urlId;
    
    // Check if a generation is already in progress for this CV
    if (inProgressGenerations.has(cvId)) {
      logger.info(`HTML generation already in progress for CV: ${cvId}, returning existing promise`);
      return inProgressGenerations.get(cvId);
    }
    
    // Create a new promise for this generation
    const generationPromise = (async () => {
      try {
        logger.info(`Starting CV HTML generation with Claude for CV: ${cvId}`);
        
        // Log the profile picture URL for debugging
        const profilePicUrl = cv.structuredData?.personalInfo?.profilePicture;
        
        // Log CV structure to debug
        logger.info(`CV structure in templateService: ${JSON.stringify({
          urlId: cv.urlId,
          hasPersonalInfo: !!cv.structuredData?.personalInfo,
          profilePicUrl: profilePicUrl
        }, null, 2)}`);
        
        // Make sure we log and use the correct value
        logger.info(`PROFILE PICTURE URL sent to Claude: "${profilePicUrl || 'None'}"`);
        
        // Get the base template
        const templateHtml = htmlTemplate.getBaseTemplate().replace('[URL_ID]', cvId);
        
        // Create the prompt for Claude
        const htmlPromptContent = `Use this EXACT HTML template to create a CV for the following structured data. 
DO NOT modify the HTML structure, CSS, or JavaScript functionality. 
ONLY replace the placeholder content (marked with [PLACEHOLDERS]) with appropriate data from the CV.

CV Data:
${JSON.stringify(cv.structuredData, null, 2)}

IMPORTANT: The profile picture URL is: "${profilePicUrl || 'None'}"
If you see a profile picture URL above, you MUST use this exact URL for the profile picture in the HTML by setting the src attribute in the img tag to this URL.

Example usage with profile picture URL:
<div class="photo-frame"><img src="EXACT_PROFILE_PICTURE_URL_HERE" alt="Profile Picture"></div>

HTML Template:
${templateHtml}

Language-specific section headings:
Use these translations for section headings based on the CV's language. If the detected language is not listed here, use English as default.

English:
- "Professional Profile"
- "Professional Experience"
- "Key Competencies"
- "Education & Certifications"
- "Languages"
- "View details"
- "Hide details"
- "html lang=\"en\""

Danish:
- "Professionel Profil"
- "Erhvervserfaring"
- "Kompetencer"
- "Uddannelse & Certificeringer"
- "Sprog"
- "Vis detaljer"
- "Skjul detaljer"
- "html lang=\"da\""

French:
- "Profil Professionnel"
- "Expérience Professionnelle"
- "Compétences Clés"
- "Éducation & Certifications"
- "Langues"
- "Voir détails"
- "Masquer détails"
- "html lang=\"fr\""

Spanish:
- "Perfil Profesional"
- "Experiencia Profesional"
- "Competencias Clave"
- "Educación y Certificaciones"
- "Idiomas"
- "Ver detalles"
- "Ocultar detalles"
- "html lang=\"es\""

German:
- "Berufliches Profil"
- "Berufserfahrung"
- "Kernkompetenzen"
- "Ausbildung & Zertifizierungen"
- "Sprachen"
- "Details anzeigen"
- "Details ausblenden"
- "html lang=\"de\""

Swedish:
- "Professionell Profil"
- "Arbetslivserfarenhet"
- "Nyckelkompetenser"
- "Utbildning & Certifieringar"
- "Språk"
- "Visa detaljer"
- "Dölj detaljer"
- "html lang=\"sv\""

Norwegian:
- "Profesjonell Profil"
- "Arbeidserfaring"
- "Nøkkelkompetanser"
- "Utdanning & Sertifiseringer"
- "Språk"
- "Vis detaljer"
- "Skjul detaljer"
- "html lang=\"no\""

Use the following guidelines for replacing placeholders:
1. CRITICAL - Update the HTML tag to include the correct language attribute based on CV language:
   - Replace the lang attribute in the html tag with the appropriate language code (e.g., "en", "da", "fr", etc.)
   - Use the language detected from the CV as specified in the language field of the structured data
   
2. Replace ALL section headings with the appropriate localized text based on the CV language:
   - [SECTION_PROFILE]: Use "Professional Profile" or its translation
   - [SECTION_EXPERIENCE]: Use "Professional Experience" or its translation
   - [SECTION_SKILLS]: Use "Key Competencies" or its translation
   - [SECTION_EDUCATION]: Use "Education & Certifications" or its translation
   - [SECTION_LANGUAGES]: Use "Languages" or its translation
   - [TEXT_VIEW_DETAILS]: Use "View details" or its translation
   - [TEXT_HIDE_DETAILS]: Use "Hide details" or its translation

3. [NAME]: Use the person's name from personalInfo.name
4. [TITLE]: Use personalInfo.title
5. [PROFILE]: Use the profile text
6. [INITIALS]: Generate initials from the name
7. [CONTACT_ITEMS]: Create contact items for each available field in personalInfo (email, phone, linkedin, location)
8. [PROFILE_PICTURE]: If personalInfo.profilePicture exists, use its EXACT value as the src attribute for the profile picture img tag (do not modify the URL in any way), otherwise use a placeholder image or the initials
9. [METRICS]: Generate metric cards using the metrics data
10. [EXPERIENCE]: Generate experience cards with achievements for each job. IMPORTANT: Do not include any icons (no checkmark icons or list style icons) before the achievement titles in the work experience section.
   - For each job experience, check the 'collapsible' property (boolean)
   - If collapsible is false (unchecked), add the class 'job-expanded' to the experience-card div
   - If collapsible is true (checked), do NOT add 'job-expanded' class to the experience-card div
   - For ALL jobs with achievements, ALWAYS include both:
     1. The achievements-section div (with all achievement items inside)
     2. A show-achievements-btn button at the bottom of the job card
   - For jobs where collapsible=false, the button should use the localized text for "Hide details" with up chevron icon
   - For jobs where collapsible=true, the button should use the localized text for "View details" with down chevron icon
   - The HTML structure must look like this for each job card:
   
     <div class="experience-card [ADD_JOB_EXPANDED_CLASS_IF_NEEDED]">
       <!-- Job header and other content here -->
       <div class="achievements-section">
         <!-- Achievement items here -->
       </div>
       <button class="show-achievements-btn">
         [APPROPRIATE_BUTTON_CONTENT_BASED_ON_COLLAPSIBLE]
       </button>
     </div>
     
     Where:
     - [ADD_JOB_EXPANDED_CLASS_IF_NEEDED]: Add the class "job-expanded" if collapsible is false (NOT if collapsible is true)
     - [APPROPRIATE_BUTTON_CONTENT_BASED_ON_COLLAPSIBLE]: Use '<i class="fas fa-chevron-up"></i> [Hide details in the CV language]' if collapsible is false, or '<i class="fas fa-chevron-down"></i> [View details in the CV language]' if collapsible is true

IMPORTANT for achievement descriptions:
1. Preserve all formatting in the achievement descriptions, including bullet points and line breaks
2. Convert newlines in achievement descriptions to <br> tags to maintain line breaks
3. If the description text contains bullet points (lines starting with * or -), render these as HTML unordered lists
4. Format any bold, italic or underlined text in the descriptions appropriately with HTML tags
11. [SKILLS]: Generate skill categories with progress bars
   - For each skill category, check the 'collapsible' property (boolean)
   - Always make the category collapsible with a toggle button, regardless of the 'collapsible' property
   - EXTREMELY IMPORTANT - FOLLOW THIS RULE EXACTLY: 
     * If the skill category's 'collapsible' property equals true (checkbox IS checked), then DO NOT add the 'active' class 
       Example: <div class="skill-category"> (without 'active' class)
     * If the skill category's 'collapsible' property equals false (checkbox is NOT checked), then ADD the 'active' class
       Example: <div class="skill-category active"> (with 'active' class)
   - Check each category's collapsible property value directly in the JSON data
   - You MUST check each category's 'collapsible' boolean property individually - do NOT assume any default state
   - The 'active' class controls whether skills are shown or hidden, so this is critical for correct behavior
   - To be absolutely clear: collapsible=true → NO active class, collapsible=false → YES add active class
   - Each skill category MUST follow this HTML structure:
     <div class="skill-category [active class only if collapsible=false]">
       <div class="category-header">
         <div class="category-name">Category Name</div>
         <div class="category-toggle"><i class="fas fa-chevron-down"></i></div>
       </div>
       <!-- Category progress bar is OUTSIDE category-content to be ALWAYS visible -->
       <div class="category-progress-container" style="padding: 16px 16px 0;">
         <div class="progress-bar">
           <div class="progress-fill" data-width="{proficiencyLevel}%" style="width: 0%;"></div>
         </div>
       </div>
       <div class="category-content">
         <!-- Individual skill items go directly here (NOT in a wrapper) -->
         <div class="skill-item">
           <div class="skill-info">
             <div class="skill-name">Skill Name</div>
             <div class="skill-level">Level</div>
           </div>
           <div class="progress-bar">
             <div class="progress-fill" data-width="{skillProficiencyLevel}%" style="width: 0%;"></div>
           </div>
         </div>
       </div>
     </div>
   - Create an animated expand/collapse effect when clicking on the category header
   - Use a downward arrow icon that rotates 180 degrees when expanded
   - Each skill category should have a header with the category name and a toggle button
   
   - CRITICAL EXAMPLE: For a skill category with collapsible=true (checkbox checked):
     <div class="skill-category"><!-- NO active class here -->
       <div class="category-header">
         <div class="category-name"><i class="fas fa-code"></i> Programming</div>
         <div class="category-toggle"><i class="fas fa-chevron-down"></i></div>
       </div>
       <!-- Category progress bar is OUTSIDE category-content to be ALWAYS visible -->
       <div class="category-progress-container" style="padding: 16px 16px 0;">
         <div class="progress-bar">
           <div class="progress-fill" data-width="85%" style="width: 0%;"></div>
         </div>
       </div>
       <div class="category-content">
         <!-- Add individual skill items directly (no wrapper div) -->
         <div class="skill-item">
           <div class="skill-info">
             <div class="skill-name">JavaScript</div>
             <div class="skill-level">Expert</div>
           </div>
           <div class="progress-bar">
             <div class="progress-fill" data-width="95%" style="width: 0%;"></div>
           </div>
         </div>
         <div class="skill-item">
           <div class="skill-info">
             <div class="skill-name">Python</div>
             <div class="skill-level">Advanced</div>
           </div>
           <div class="progress-bar">
             <div class="progress-fill" data-width="85%" style="width: 0%;"></div>
           </div>
         </div>
       </div>
     </div>
     
   - CRITICAL EXAMPLE: For a skill category with collapsible=false (checkbox unchecked):
     <div class="skill-category active"><!-- active class added here -->
       <div class="category-header">
         <div class="category-name"><i class="fas fa-language"></i> Languages</div>
         <div class="category-toggle"><i class="fas fa-chevron-down"></i></div>
       </div>
       <!-- Category progress bar is OUTSIDE category-content to be ALWAYS visible -->
       <div class="category-progress-container" style="padding: 16px 16px 0;">
         <div class="progress-bar">
           <div class="progress-fill" data-width="90%" style="width: 0%;"></div>
         </div>
       </div>
       <div class="category-content">
         <!-- Add individual skill items directly (no wrapper div) -->
         <div class="skill-item">
           <div class="skill-info">
             <div class="skill-name">English</div>
             <div class="skill-level">Fluent</div>
           </div>
           <div class="progress-bar">
             <div class="progress-fill" data-width="98%" style="width: 0%;"></div>
           </div>
         </div>
       </div>
     </div>

   - IMPORTANT: DO NOT USE ANY WRAPPER DIV AROUND THE INDIVIDUAL SKILL ITEMS
   - Add individual skill items DIRECTLY in the category-content div
   - The category progress bar must ALWAYS be placed OUTSIDE the category-content div
   - Individual skill items should go INSIDE the category-content div
   - Each skill category has a 'proficiencyLevel' property (0-100)
   - The complete structure must look exactly like this:

     <div class="skill-category [active class only if collapsible=false]">
       <div class="category-header">...</div>
       
       <!-- Category progress bar OUTSIDE category-content -->
       <div class="category-progress-container" style="padding: 16px 16px 0;">
         <div class="progress-bar">
           <div class="progress-fill" data-width="{proficiencyLevel}%" style="width: 0%;"></div>
         </div>
       </div>
       
       <div class="category-content">
         <!-- Individual skills go directly here (without any wrapper div) -->
         <div class="skill-item">...</div>
         <div class="skill-item">...</div>
       </div>
     </div>
     
   - This structure exactly matches the working example code and ensures proper collapsing/expanding behavior
12. [EDUCATION]: Generate education items
13. [LANGUAGES]: Generate language proficiency items

Maintain all CSS classes, HTML structure, and JavaScript functionality exactly as in the template.

Return ONLY the complete HTML with all placeholders replaced with actual data. No explanations or additional text.`;

        let html = '';
        
        if (mcp && process.env.USE_MCP === 'true') {
          // Use MCP to generate HTML
          logger.info('Using MCP for CV HTML generation');
          
          const response = await mcpClient.sendModelRequest(mcp, {
            model: claudeModel || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
            prompt: htmlPromptContent,
            max_tokens: 64000,
            temperature: 0.1
          });
          
          if (!response || !response.content) {
            throw new Error('Empty response from model via MCP');
          }
          
          html = response.content;
        } else {
          // Fallback to direct API call
          logger.info('Using direct API call for CV HTML generation');
          
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': claudeApiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: claudeModel || "claude-3-7-sonnet-20250219",
              max_tokens: 64000,
              temperature: 0.1,
              messages: [
                {
                  role: 'user',
                  content: htmlPromptContent
                }
              ]
            })
          });
      
          if (!response.ok) {
            const errorDetails = await response.json();
            throw new Error(`Claude API error: ${errorDetails.error?.message || JSON.stringify(errorDetails)}`);
          }
      
          const responseData = await response.json();
          logger.info('Claude API response received for HTML generation');
      
          // Extract HTML from response
          if (responseData.content && responseData.content.length > 0) {
            html = responseData.content[0].text;
            
            // Check if the profile picture URL is in the generated HTML
            const profilePicUrl = cv.structuredData?.personalInfo?.profilePicture || '';
            if (profilePicUrl) {
              // Check if the URL is in the HTML
              if (html.includes(profilePicUrl)) {
                logger.info(`SUCCESS: Profile picture URL found in generated HTML`);
              } else {
                logger.warn(`WARNING: Profile picture URL NOT found in generated HTML`);
                
                // Check for image tag format
                const imgTagMatch = html.match(/<img src="([^"]+)" alt=/);
                if (imgTagMatch && imgTagMatch[1]) {
                  logger.info(`Image src attribute instead contains: "${imgTagMatch[1]}"`);
                }
              }
            }
          } else {
            throw new Error('Empty response from Claude API');
          }
        }
        
        return html;
      } finally {
        // Remove from in-progress map when done
        inProgressGenerations.delete(cvId);
      }
    })();

    // Store the promise in the map
    inProgressGenerations.set(cvId, generationPromise);
    
    // Wait for the HTML generation
    let html = await generationPromise;
    
    // Try to extract HTML if wrapped in code blocks
    const htmlMatch = html.match(/```html\n([\s\S]*?)\n```/) || 
                   html.match(/```\n([\s\S]*?)\n```/);
    
    if (htmlMatch) {
      html = htmlMatch[1];
    }

    // Add tracking script
    logger.info('Adding tracking scripts to generated HTML');
    // Check if profile picture needs to be fixed
    let processedHtml = html;
    const profilePicUrl = cv.structuredData?.personalInfo?.profilePicture;
    
    if (profilePicUrl && !html.includes(profilePicUrl)) {
      logger.warn('Profile picture URL not found in HTML, attempting to fix it');
      
      // Find the image tag in the photo-frame
      const imgTagRegex = /<div class="photo-frame">\s*<img src="([^"]*)" alt="([^"]*)"\s*>/;
      const match = html.match(imgTagRegex);
      
      if (match) {
        // Replace the src attribute with the correct URL
        const fixedImgTag = `<div class="photo-frame"><img src="${profilePicUrl}" alt="${match[2]}">`;
        processedHtml = html.replace(match[0], fixedImgTag);
        logger.info('Successfully fixed profile picture URL in HTML');
      } else {
        logger.error('Could not find image tag to fix profile picture URL');
      }
    }
    
    const finalHtml = addEnhancedTracking(processedHtml, cv.urlId);
    logger.info('CV HTML generation completed successfully');
    return finalHtml;
  } catch (error) {
    logger.error('Error generating CV HTML:', error);
    throw error;
  }
};

/**
 * Adds analytics tracking script to the generated HTML
 * @param {String} html - The HTML content
 * @param {String} urlId - The CV's URL ID
 * @returns {String} - HTML with tracking script
 */
function addEnhancedTracking(html, urlId) {
  // IMPORTANT: Using actual urlId value, not template literal
  const trackingScript = `
<script>
// Analytics tracking code
document.addEventListener('DOMContentLoaded', function() {
  // Track page view
  fetch('/api/analytics/cv/${urlId}/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).catch(error => console.error('Error tracking view:', error));
  
  // Add click tracking to expandable sections
  document.querySelectorAll('.achievement-item').forEach((section, index) => {
    const header = section.querySelector('.achievement-header');
    if (!header) return;
    
    // Get section title
    const titleElement = section.querySelector('.achievement-title');
    const sectionTitle = titleElement ? titleElement.textContent.trim() : 'Section ' + index;
    const sectionId = 'section-' + index;
    
    header.addEventListener('click', function() {
      // Track section click
      fetch('/api/analytics/cv/${urlId}/section/' + sectionId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionTitle })
      }).catch(error => console.error('Error tracking section click:', error));
    });
  });
  
  // Enhanced section tracking for more detailed analytics
  document.querySelectorAll('.achievement-header, .skill-category, .course-item, .language-item').forEach((element, index) => {
    // Determine section type and title
    let sectionType = '';
    let sectionTitle = '';
    
    if (element.classList.contains('achievement-header')) {
      sectionType = 'achievement';
      sectionTitle = element.querySelector('.achievement-title')?.textContent || 'Achievement ' + index;
    } else if (element.closest('.skill-category')) {
      sectionType = 'skill';
      sectionTitle = element.closest('.skill-category').querySelector('.category-name')?.textContent || 'Skill ' + index;
    } else if (element.classList.contains('course-item')) {
      sectionType = 'education';
      sectionTitle = element.querySelector('.course-name')?.textContent || 'Education ' + index;
    } else if (element.classList.contains('language-item')) {
      sectionType = 'language';
      sectionTitle = element.querySelector('.language-name')?.textContent || 'Language ' + index;
    }
    
    // Add click event listener for detailed tracking
    element.addEventListener('click', function() {
      fetch('/api/analytics/cv/${urlId}/section-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sectionId: sectionType + '-' + index,
          sectionTitle: sectionTitle,
          sectionType: sectionType,
          action: 'click'
        })
      }).catch(error => console.error('Error tracking interaction:', error));
    });
  });
});
</script>`;

  const printButton = `
<div class="print-controls" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
  <button id="print-button" style="background-color: var(--primary); color: white; border: none; border-radius: 50%; width: 50px; height: 50px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
    <i class="fas fa-print"></i>
  </button>
</div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('print-button').addEventListener('click', function() {
      // Open print dialog
      window.print();
    });
  });
</script>`;

  // Fix the tracking script by replacing ${urlId} with the actual urlId value
  const fixedTrackingScript = trackingScript.replace(/\${urlId}/g, urlId);
  
  // Inject tracking script and print button before closing body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${fixedTrackingScript}\n${printButton}\n</body>`);
  } else {
    return html + '\n' + fixedTrackingScript + '\n' + printButton;
  }
}

/**
 * @param {Object} cv - The CV object
 * @returns {String} - Print-friendly HTML
 */
exports.generatePrintFriendlyVersion = async (cv, claudeApiKey, claudeModel) => {
  // Similar to generateCvHtml but using the print template
  const printTemplate = htmlTemplate.getPrintFriendlyTemplate ? htmlTemplate.getPrintFriendlyTemplate() : "Print template not implemented";
  // Implementation similar to generateCvHtml...
  // For brevity, not fully implemented here
  return "Print-friendly version generation not yet implemented";
};