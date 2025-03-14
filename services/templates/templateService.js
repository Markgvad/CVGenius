// services/templates/templateService.js
const fetch = require('node-fetch');
const htmlTemplate = require('./htmlTemplate');

/**
 * Generates HTML for a CV using Claude API
 * @param {Object} cv - The CV object with structured data
 * @param {String} claudeApiKey - The Claude API key
 * @param {String} claudeModel - The Claude model to use
 * @returns {Promise<String>} - The generated HTML
 */
exports.generateCvHtml = async (cv, claudeApiKey, claudeModel) => {
  try {
    // Get the base template
    const templateHtml = htmlTemplate.getBaseTemplate().replace('[URL_ID]', cv.urlId);
    
    // Create the prompt for Claude
    const htmlPromptContent = `Use this EXACT HTML template to create a CV for the following structured data. 
DO NOT modify the HTML structure, CSS, or JavaScript functionality. 
ONLY replace the placeholder content (marked with [PLACEHOLDERS]) with appropriate data from the CV.

CV Data:
${JSON.stringify(cv.structuredData, null, 2)}

HTML Template:
${templateHtml}

Use the following guidelines for replacing placeholders:
1. [NAME]: Use the person's name from personalInfo.name
2. [TITLE]: Use personalInfo.title
3. [PROFILE]: Use the profile text
4. [INITIALS]: Generate initials from the name
5. [CONTACT_ITEMS]: Create contact items for each available field in personalInfo (email, phone, linkedin, location)
6. [METRICS]: Generate metric cards using the metrics data
7. [EXPERIENCE]: Generate experience cards with achievements for each job
8. [SKILLS]: Generate skill categories with progress bars
9. [EDUCATION]: Generate education items
10. [LANGUAGES]: Generate language proficiency items

Maintain all CSS classes, HTML structure, and JavaScript functionality exactly as in the template.

Return ONLY the complete HTML with all placeholders replaced with actual data. No explanations or additional text.`;

    // Call Claude API
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
    console.log('Claude API response received for HTML generation');

    // Extract HTML from response
    let html = '';
    if (responseData.content && responseData.content.length > 0) {
      html = responseData.content[0].text;
    } else {
      throw new Error('Empty response from Claude API');
    }
    
    // Try to extract HTML if wrapped in code blocks
    const htmlMatch = html.match(/```html\n([\s\S]*?)\n```/) || 
                     html.match(/```\n([\s\S]*?)\n```/);
    
    if (htmlMatch) {
      html = htmlMatch[1];
    }

    // Add tracking script
    return addEnhancedTracking(html, cv.urlId);
  } catch (error) {
    console.error('Error generating CV HTML:', error);
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