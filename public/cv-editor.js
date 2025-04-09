// Global variable to store CV data
let cvData = {};

// Document ready function
document.addEventListener('DOMContentLoaded', function() {
    console.log('CV Editor initialized');
    
    // Get CV ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const cvId = urlParams.get('id');
    
    if (cvId) {
        console.log('Loading CV data for ID:', cvId);
        loadCVData(cvId);
        
        // Also check for custom URL
        checkForCustomUrl(cvId);
    } else {
        console.error('No CV ID provided in URL');
        showAlert('No CV ID provided. Please upload a CV first.', 'error');
    }
    
    // Setup navigation
    setupNavigation();
    
    // Setup form event handlers
    setupFormHandlers();
    
    // Setup modal
    setupModal();
    
    // Setup animations for metric examples
    setupMetricExampleAnimations();
});

// Load CV data from API
function loadCVData(cvId) {
    // Show loading indicator
    document.body.classList.add('loading');
    
    fetch(`/api/cv/${cvId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load CV data: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('CV data loaded successfully:', data);
            // Debug output to diagnose structure
            console.log('Personal Info structure:', data.personalInfo);
            console.log('Profile data:', data.profile);
            
            cvData = data;
            
            // Populate form with CV data
            populateFormFields(data);
            
            // Hide loading indicator
            document.body.classList.remove('loading');
        })
        .catch(error => {
            console.error('Error loading CV data:', error);
            showAlert('Failed to load CV data. Please try again.', 'error');
            document.body.classList.remove('loading');
        });
}

// Check for custom URL
function checkForCustomUrl(cvId) {
    fetch(`/api/cv/meta/${cvId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load CV metadata: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('CV metadata loaded:', data);
            
            if (data.customUrlName) {
                // Display the custom URL
                const baseUrl = window.location.origin;
                const customUrl = `${baseUrl}/${data.customUrlName}`;
                
                const urlLink = document.getElementById('custom-url-link');
                const urlContainer = document.getElementById('custom-url-container');
                
                if (urlLink && urlContainer) {
                    urlLink.href = customUrl;
                    urlLink.textContent = customUrl;
                    urlContainer.style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Error checking custom URL:', error);
            // Non-critical, so we don't show an alert
        });
}

// Populate form fields with CV data
function populateFormFields(data) {
    console.log('Populating form fields with CV data');
    
    // Debug print full personal info data
    console.log('Personal Info data for form population:', JSON.stringify(data.personalInfo || {}));
    
    // Personal Info
    try {
        // Check if personalInfo exists and is an object
        if (typeof data.personalInfo !== 'object' || data.personalInfo === null) {
            console.error('personalInfo is not an object:', data.personalInfo);
            data.personalInfo = {}; // Create empty object as fallback
        }
        
        // Set each field individually with thorough error checking
        const nameInput = document.getElementById('name');
        if (nameInput) {
            nameInput.value = data.personalInfo.name || '';
            console.log(`Set name field to: "${nameInput.value}"`);
        } else {
            console.error('Could not find name input element');
        }
        
        const titleInput = document.getElementById('title');
        if (titleInput) {
            titleInput.value = data.personalInfo.title || '';
            console.log(`Set title field to: "${titleInput.value}"`);
        } else {
            console.error('Could not find title input element');
        }
        
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = data.personalInfo.email || '';
            console.log(`Set email field to: "${emailInput.value}"`);
        } else {
            console.error('Could not find email input element');
        }
        
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.value = data.personalInfo.phone || '';
            console.log(`Set phone field to: "${phoneInput.value}"`);
        } else {
            console.error('Could not find phone input element');
        }
        
        const linkedinInput = document.getElementById('linkedin');
        if (linkedinInput) {
            linkedinInput.value = data.personalInfo.linkedin || '';
            console.log(`Set linkedin field to: "${linkedinInput.value}"`);
        } else {
            console.error('Could not find linkedin input element');
        }
        
        const locationInput = document.getElementById('location');
        if (locationInput) {
            locationInput.value = data.personalInfo.location || '';
            console.log(`Set location field to: "${locationInput.value}"`);
        } else {
            console.error('Could not find location input element');
        }
    } catch (error) {
        console.error('Error setting personal info fields:', error);
    }
    
    // Profile Picture
    if (data.personalInfo?.profilePicture) {
        document.getElementById('profile-preview').src = data.personalInfo.profilePicture;
        document.getElementById('crop-image-btn').disabled = false;
        document.getElementById('remove-image-btn').disabled = false;
    }
    
    // Profile - add detailed logging
    console.log('Profile data for form population:', typeof data.profile, data.profile ? `length: ${data.profile.length}` : 'is empty');
    
    try {
        const profileTextInput = document.getElementById('profile-text');
        if (profileTextInput) {
            profileTextInput.value = data.profile || '';
            console.log(`Set profile text field to ${profileTextInput.value.length} characters`);
            if (profileTextInput.value.length > 0) {
                console.log(`Sample: "${profileTextInput.value.substring(0, 50)}..."`);
            } else {
                console.warn('Profile text is empty!');
            }
        } else {
            console.error('Could not find profile-text input element');
        }
    } catch (error) {
        console.error('Error setting profile text:', error);
    }
    
    // Metrics
    const metricsContainer = document.getElementById('metrics-container');
    metricsContainer.innerHTML = ''; // Clear existing metrics
    
    if (data.metrics && data.metrics.length > 0) {
        data.metrics.forEach(metric => {
            addMetric(metric);
        });
    }
    
    // Experience
    const experienceContainer = document.getElementById('experience-container');
    experienceContainer.innerHTML = ''; // Clear existing experience
    
    if (data.experience && data.experience.length > 0) {
        data.experience.forEach(exp => {
            addExperience(exp);
        });
    }
    
    // Skills
    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = ''; // Clear existing skills
    
    if (data.skills && data.skills.length > 0) {
        data.skills.forEach(category => {
            addSkillCategory(category);
        });
    }
    
    // Education
    const educationContainer = document.getElementById('education-container');
    educationContainer.innerHTML = ''; // Clear existing education
    
    if (data.education && data.education.length > 0) {
        data.education.forEach(edu => {
            addEducation(edu);
        });
    }
    
    // Languages
    const languagesContainer = document.getElementById('languages-container');
    languagesContainer.innerHTML = ''; // Clear existing languages
    
    if (data.languages && data.languages.length > 0) {
        data.languages.forEach(lang => {
            addLanguage(lang);
        });
    }
    
    console.log('Form population complete');
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.editor-nav li');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Update active nav item
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('data-target');
            const sections = document.querySelectorAll('.editor-section');
            
            sections.forEach(section => {
                section.classList.remove('active');
                // Also ensure display is set properly
                section.style.display = 'none';
            });
            
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block';
            }
        });
    });
    
    console.log('Navigation setup complete');
}

// Setup form event handlers
function setupFormHandlers() {
    // Add Metric
    document.getElementById('add-metric').addEventListener('click', function() {
        addMetric();
    });
    
    // Add Experience at the bottom
    document.getElementById('add-experience').addEventListener('click', function() {
        addExperience();
    });
    
    // Add Recent Experience at the top
    document.getElementById('add-recent-experience').addEventListener('click', function() {
        addExperience(null, true); // true indicates to add at the top
    });
    
    // Add Skill Category
    document.getElementById('add-skill-category').addEventListener('click', function() {
        addSkillCategory();
    });
    
    // Add Education
    document.getElementById('add-education').addEventListener('click', function() {
        addEducation();
    });
    
    // Add Language
    document.getElementById('add-language').addEventListener('click', function() {
        addLanguage();
    });
    
    // Save Button
    document.getElementById('save-btn').addEventListener('click', function() {
        saveCV();
    });
    
    // Generate Button
    document.getElementById('generate-btn').addEventListener('click', function() {
        openGenerateModal();
    });
    
    // Setup profile picture functionality
    setupProfilePicture();
    
    console.log('Form handlers setup complete');
}

// Add a new metric
function addMetric(data = null) {
    const metricsContainer = document.getElementById('metrics-container');
    const template = document.getElementById('metric-template');
    const metricElement = document.importNode(template.content, true);
    
    // Set values if data provided
    if (data) {
        metricElement.querySelector('.metric-icon').value = data.icon || '';
        metricElement.querySelector('.metric-value').value = data.value || '';
        metricElement.querySelector('.metric-suffix').value = data.suffix || '';
        metricElement.querySelector('.metric-label').value = data.label || '';
    }
    
    // Setup delete button
    metricElement.querySelector('.delete-btn').addEventListener('click', function() {
        this.closest('.metric-item').remove();
    });
    
    metricsContainer.appendChild(metricElement);
}

// Add a new experience
function addExperience(data = null, addAtTop = false) {
    const experienceContainer = document.getElementById('experience-container');
    const template = document.getElementById('experience-template');
    const experienceElement = document.importNode(template.content, true);
    
    // Set values if data provided
    if (data) {
        experienceElement.querySelector('.experience-title').value = data.title || '';
        experienceElement.querySelector('.experience-company').value = data.company || '';
        experienceElement.querySelector('.experience-start-date').value = data.startDate || '';
        experienceElement.querySelector('.experience-end-date').value = data.endDate || '';
        
        // Set collapsible option (default to true if not specified)
        const collapsibleCheckbox = experienceElement.querySelector('.make-collapsible');
        collapsibleCheckbox.checked = data.collapsible !== undefined ? data.collapsible : true;
        
        // Add achievements
        const achievementsContainer = experienceElement.querySelector('.achievements-container');
        
        if (data.achievements && data.achievements.length > 0) {
            data.achievements.forEach(achievement => {
                addAchievement(achievementsContainer, achievement);
            });
        }
    }
    
    // Setup add achievement button
    experienceElement.querySelector('.add-achievement-btn').addEventListener('click', function() {
        const achievementsContainer = this.previousElementSibling;
        addAchievement(achievementsContainer);
    });
    
    // Setup move up button
    experienceElement.querySelector('.move-up-btn').addEventListener('click', function() {
        const item = this.closest('.experience-item');
        const prevItem = item.previousElementSibling;
        if (prevItem) {
            experienceContainer.insertBefore(item, prevItem);
        }
    });
    
    // Setup move down button
    experienceElement.querySelector('.move-down-btn').addEventListener('click', function() {
        const item = this.closest('.experience-item');
        const nextItem = item.nextElementSibling;
        if (nextItem) {
            experienceContainer.insertBefore(nextItem, item);
        }
    });
    
    // Setup delete button
    experienceElement.querySelector('.delete-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this experience?')) {
            this.closest('.experience-item').remove();
        }
    });
    
    // Add the experience element to the container (at top or bottom)
    if (addAtTop && experienceContainer.firstChild) {
        experienceContainer.insertBefore(experienceElement, experienceContainer.firstChild);
    } else {
        experienceContainer.appendChild(experienceElement);
    }
}

// Add a new achievement
function addAchievement(container, data = null) {
    const template = document.getElementById('achievement-template');
    const achievementElement = document.importNode(template.content, true);
    
    // Set values if data provided
    if (data) {
        achievementElement.querySelector('.achievement-title').value = data.title || '';
        achievementElement.querySelector('.achievement-description').value = data.description || '';
    }
    
    // Setup delete button
    achievementElement.querySelector('.delete-btn').addEventListener('click', function() {
        this.closest('.achievement-item').remove();
    });
    
    container.appendChild(achievementElement);
}

// Add a new skill category
function addSkillCategory(data = null) {
    const skillsContainer = document.getElementById('skills-container');
    const template = document.getElementById('skill-category-template');
    const categoryElement = document.importNode(template.content, true);
    
    // Get the main category item container for easier reference
    const categoryItem = categoryElement.querySelector('.skill-category-item');
    
    // Set up category proficiency slider
    const categorySlider = categoryElement.querySelector('.category-level-slider');
    const categoryValueDisplay = categoryElement.querySelector('.category-level-value');
    
    // Add event listener to category slider for both input and change events
    categorySlider.addEventListener('input', function() {
        const value = this.value;
        categoryValueDisplay.textContent = value + '%';
        // Also update the hidden input for more reliable retrieval
        categoryElement.querySelector('.category-level-hidden').value = value;
    });
    
    // Add change event for when slider stops - extra insurance
    categorySlider.addEventListener('change', function() {
        const value = this.value;
        categoryValueDisplay.textContent = value + '%';
        // Ensure hidden input is updated on final value
        categoryElement.querySelector('.category-level-hidden').value = value;
    });
    
    // Set values if data provided
    if (data) {
        categoryElement.querySelector('.skill-category-name').value = data.name || '';
        categoryElement.querySelector('.skill-category-icon').value = data.icon || '';
        
        // Set proficiency level if provided (handle both property name formats for backward compatibility)
        const profLevel = data.proficiencyLevel !== undefined ? data.proficiencyLevel : data.categoryLevel;
        console.log('Loading skill category with proficiency level:', profLevel, 'from data:', data);
        
        // Ensure we get a valid number for proficiency level
        let validProfLevel = 85; // Default fallback
        
        if (profLevel !== undefined && !isNaN(parseInt(profLevel))) {
            validProfLevel = parseInt(profLevel);
            // Ensure it's within valid range
            validProfLevel = Math.max(0, Math.min(100, validProfLevel));
            console.log(`Using saved proficiency level: ${validProfLevel}`);
        } else {
            console.log('No valid proficiency level found in data, using default');
            // Use default value from the HTML
            validProfLevel = parseInt(categorySlider.getAttribute('data-default') || 85);
        }
        
        // Set all relevant fields to ensure consistency
        categorySlider.value = validProfLevel;
        categoryValueDisplay.textContent = validProfLevel + '%';
        categoryElement.querySelector('.category-level-hidden').value = validProfLevel;
        
        // Set collapsible option (default to true if not specified)
        const collapsibleCheckbox = categoryElement.querySelector('.make-skills-collapsible');
        collapsibleCheckbox.checked = data.collapsible !== undefined ? data.collapsible : true;
        
        // Add skills
        const skillsListContainer = categoryElement.querySelector('.skills-list-container');
        
        if (data.skills && data.skills.length > 0) {
            data.skills.forEach(skill => {
                addSkill(skillsListContainer, skill);
            });
        }
    }
    
    // Setup add skill button
    categoryElement.querySelector('.add-skill-btn').addEventListener('click', function() {
        const skillsListContainer = this.previousElementSibling;
        addSkill(skillsListContainer);
    });
    
    // Setup delete button
    categoryElement.querySelector('.skill-category-delete-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this entire skill category and all its skills?')) {
            this.closest('.skill-category-item').remove();
            showAlert('Skill category deleted.', 'success');
        }
    });
    
    skillsContainer.appendChild(categoryElement);
}

// Add a new skill
function addSkill(container, data = null) {
    const template = document.getElementById('skill-item-template');
    const skillElement = document.importNode(template.content, true);
    
    // Get elements
    const slider = skillElement.querySelector('.skill-level-slider');
    const valueDisplay = skillElement.querySelector('.skill-level-value');
    const selectElement = skillElement.querySelector('.skill-level');
    
    // Update the select value based on slider value
    function updateSkillLevel(value) {
        valueDisplay.textContent = value + '%';
        
        // Map percentage to skill level based on language of CV
        let level;
        
        // Determine language from cvData
        const language = cvData.language || 'english';
        
        if (language === 'danish') {
            // Danish terms
            if (value < 20) level = 'Begynder';
            else if (value < 40) level = 'Grundlæggende';
            else if (value < 60) level = 'Øvet';
            else if (value < 80) level = 'Avanceret';
            else level = 'Ekspert';
        } else if (language === 'spanish') {
            // Spanish terms
            if (value < 20) level = 'Principiante';
            else if (value < 40) level = 'Básico';
            else if (value < 60) level = 'Intermedio';
            else if (value < 80) level = 'Avanzado';
            else level = 'Experto';
        } else if (language === 'french') {
            // French terms
            if (value < 20) level = 'Débutant';
            else if (value < 40) level = 'Élémentaire';
            else if (value < 60) level = 'Intermédiaire';
            else if (value < 80) level = 'Avancé';
            else level = 'Expert';
        } else if (language === 'german') {
            // German terms
            if (value < 20) level = 'Anfänger';
            else if (value < 40) level = 'Grundkenntnisse';
            else if (value < 60) level = 'Mittelstufe';
            else if (value < 80) level = 'Fortgeschritten';
            else level = 'Experte';
        } else {
            // Default English terms
            if (value < 20) level = 'Beginner';
            else if (value < 40) level = 'Basic';
            else if (value < 60) level = 'Intermediate';
            else if (value < 80) level = 'Advanced';
            else level = 'Expert';
        }
        
        // Set the value directly to the selectElement
        selectElement.value = level;
    }
    
    // Add event listener to slider
    slider.addEventListener('input', function() {
        updateSkillLevel(this.value);
    });
    
    // Set values if data provided
    if (data) {
        skillElement.querySelector('.skill-name').value = data.name || '';
        
        // Determine proficiency level
        let percentValue;
        
        // If we have a stored percentage value, use it directly
        if (data.percentValue !== undefined && !isNaN(parseInt(data.percentValue))) {
            percentValue = parseInt(data.percentValue);
            console.log(`Using stored percentage value: ${percentValue}% for skill: ${data.name}`);
        } else {
            // Otherwise, map from text level
            const level = data.level || 'Intermediate';
            
            // Map text level to percentage value based on language
            const language = cvData.language || 'english';
            
            // Check for language-specific values first
            if (language === 'danish') {
                // Danish skill levels
                switch(level) {
                    case 'Begynder': percentValue = 10; break;
                    case 'Grundlæggende': percentValue = 30; break;
                    case 'Øvet': percentValue = 50; break;
                    case 'Avanceret': percentValue = 70; break;
                    case 'Ekspert': percentValue = 90; break;
                    default: percentValue = 50; break;
                }
            } else if (language === 'spanish') {
                // Spanish skill levels
                switch(level) {
                    case 'Principiante': percentValue = 10; break;
                    case 'Básico': percentValue = 30; break;
                    case 'Intermedio': percentValue = 50; break;
                    case 'Avanzado': percentValue = 70; break;
                    case 'Experto': percentValue = 90; break;
                    default: percentValue = 50; break;
                }
            } else if (language === 'french') {
                // French skill levels
                switch(level) {
                    case 'Débutant': percentValue = 10; break;
                    case 'Élémentaire': percentValue = 30; break;
                    case 'Intermédiaire': percentValue = 50; break;
                    case 'Avancé': percentValue = 70; break;
                    case 'Expert': percentValue = 90; break;
                    default: percentValue = 50; break;
                }
            } else if (language === 'german') {
                // German skill levels
                switch(level) {
                    case 'Anfänger': percentValue = 10; break;
                    case 'Grundkenntnisse': percentValue = 30; break;
                    case 'Mittelstufe': percentValue = 50; break;
                    case 'Fortgeschritten': percentValue = 70; break;
                    case 'Experte': percentValue = 90; break;
                    default: percentValue = 50; break;
                }
            } else {
                // Default English skill levels
                switch(level) {
                    case 'Beginner': percentValue = 10; break;
                    case 'Basic': percentValue = 30; break;
                    case 'Intermediate': percentValue = 50; break;
                    case 'Advanced': percentValue = 70; break;
                    case 'Expert': percentValue = 90; break;
                    default: percentValue = 50; break;
                }
            }
            console.log(`Mapped text level "${level}" to percentage: ${percentValue}% for skill: ${data.name}`);
        }
        
        // Set slider value and update the UI
        slider.value = percentValue;
        updateSkillLevel(percentValue);
    }
    
    // Setup delete button
    skillElement.querySelector('.delete-btn').addEventListener('click', function() {
        this.closest('.skill-item').remove();
    });
    
    container.appendChild(skillElement);
}

// Add a new education
function addEducation(data = null) {
    const educationContainer = document.getElementById('education-container');
    const template = document.getElementById('education-template');
    const educationElement = document.importNode(template.content, true);
    
    // Set values if data provided
    if (data) {
        educationElement.querySelector('.education-degree').value = data.degree || '';
        educationElement.querySelector('.education-institution').value = data.institution || '';
        educationElement.querySelector('.education-start-year').value = data.startYear || '';
        educationElement.querySelector('.education-end-year').value = data.endYear || '';
    }
    
    // Setup move up button
    educationElement.querySelector('.move-up-btn').addEventListener('click', function() {
        const item = this.closest('.education-item');
        const prevItem = item.previousElementSibling;
        if (prevItem) {
            educationContainer.insertBefore(item, prevItem);
        }
    });
    
    // Setup move down button
    educationElement.querySelector('.move-down-btn').addEventListener('click', function() {
        const item = this.closest('.education-item');
        const nextItem = item.nextElementSibling;
        if (nextItem) {
            educationContainer.insertBefore(nextItem, item);
        }
    });
    
    // Setup delete button
    educationElement.querySelector('.delete-btn').addEventListener('click', function() {
        this.closest('.education-item').remove();
    });
    
    educationContainer.appendChild(educationElement);
}

// Add a new language
function addLanguage(data = null) {
    const languagesContainer = document.getElementById('languages-container');
    const template = document.getElementById('language-template');
    const languageElement = document.importNode(template.content, true);
    
    // Set values if data provided
    if (data) {
        languageElement.querySelector('.language-name').value = data.name || '';
        
        const proficiencyInput = languageElement.querySelector('.language-proficiency');
        const proficiency = data.proficiency || '';
        
        // Set the proficiency value directly to the input field
        proficiencyInput.value = proficiency;
    }
    
    // Setup delete button
    languageElement.querySelector('.delete-btn').addEventListener('click', function() {
        this.closest('.language-item').remove();
    });
    
    languagesContainer.appendChild(languageElement);
}

// Collect CV data from form
function collectFormData() {
    console.log('Collecting form data');
    
    // Create form data object, preserving the language field if it exists in the original data
    const formData = {
        // Preserve the language field if it exists in the current cvData
        language: cvData.language || '',
        personalInfo: {
            name: document.getElementById('name').value,
            title: document.getElementById('title').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            linkedin: document.getElementById('linkedin').value,
            location: document.getElementById('location').value,
            profilePicture: document.getElementById('profile-preview').src.includes('data:image/svg+xml') ? null : document.getElementById('profile-preview').src
        },
        profile: document.getElementById('profile-text').value,
        metrics: [],
        experience: [],
        skills: [],
        education: [],
        languages: []
    };
    
    // Collect metrics
    document.querySelectorAll('.metric-item').forEach(item => {
        formData.metrics.push({
            icon: item.querySelector('.metric-icon').value,
            value: item.querySelector('.metric-value').value,
            suffix: item.querySelector('.metric-suffix').value,
            label: item.querySelector('.metric-label').value
        });
    });
    
    // Collect experience
    document.querySelectorAll('.experience-item').forEach(item => {
        const experienceData = {
            title: item.querySelector('.experience-title').value,
            company: item.querySelector('.experience-company').value,
            startDate: item.querySelector('.experience-start-date').value,
            endDate: item.querySelector('.experience-end-date').value,
            collapsible: item.querySelector('.make-collapsible').checked,
            achievements: []
        };
        
        // Collect achievements
        item.querySelectorAll('.achievement-item').forEach(achievement => {
            experienceData.achievements.push({
                title: achievement.querySelector('.achievement-title').value,
                description: achievement.querySelector('.achievement-description').value
            });
        });
        
        formData.experience.push(experienceData);
    });
    
    // Collect skills
    document.querySelectorAll('.skill-category-item').forEach(item => {
        // Try to get the hidden input value first (most reliable)
        let sliderValue = 85; // Default value
        try {
            const hiddenInput = item.querySelector('.category-level-hidden');
            const slider = item.querySelector('.category-level-slider');
            const categoryName = item.querySelector('.skill-category-name').value;
            
            if (hiddenInput && hiddenInput.value) {
                sliderValue = parseInt(hiddenInput.value);
                console.log(`Getting proficiency for "${categoryName}" from hidden input: ${sliderValue}`);
            } else if (slider) {
                // Fall back to slider if hidden input not found
                sliderValue = parseInt(slider.value);
                console.log(`Getting proficiency for "${categoryName}" from slider: ${sliderValue}`);
            }
            
            // Validate the value is a number between 0-100
            if (isNaN(sliderValue) || sliderValue < 0 || sliderValue > 100) {
                console.warn(`Invalid slider value found (${sliderValue}), resetting to 85`);
                sliderValue = 85;
            }
        } catch (e) {
            console.error('Error getting proficiency level:', e);
        }
        console.log('Saving skill category with proficiency level:', sliderValue);
        
        const categoryData = {
            name: item.querySelector('.skill-category-name').value,
            icon: item.querySelector('.skill-category-icon').value,
            proficiencyLevel: sliderValue,
            categoryLevel: sliderValue, // Add both formats for backward compatibility
            collapsible: item.querySelector('.make-skills-collapsible').checked,
            skills: []
        };
        
        // Collect skills in category
        item.querySelectorAll('.skill-item').forEach(skill => {
            // Get both percentage and text level values
            const percentValue = skill.querySelector('.skill-level-slider').value;
            const textLevel = skill.querySelector('.skill-level').value;
            
            // Store both values for better compatibility
            categoryData.skills.push({
                name: skill.querySelector('.skill-name').value,
                level: textLevel,
                percentValue: percentValue
            });
        });
        
        formData.skills.push(categoryData);
    });
    
    // Collect education
    document.querySelectorAll('.education-item').forEach(item => {
        formData.education.push({
            degree: item.querySelector('.education-degree').value,
            institution: item.querySelector('.education-institution').value,
            startYear: item.querySelector('.education-start-year').value,
            endYear: item.querySelector('.education-end-year').value
        });
    });
    
    // Collect languages
    document.querySelectorAll('.language-item').forEach(item => {
        formData.languages.push({
            name: item.querySelector('.language-name').value,
            proficiency: item.querySelector('.language-proficiency').value
        });
    });
    
    return formData;
}

// Save CV data
async function saveCV() {
    // Get CV ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const cvId = urlParams.get('id');
    
    if (!cvId) {
        showAlert('No CV ID provided.', 'error');
        return Promise.reject(new Error('No CV ID provided'));
    }
    
    // Show saving visual feedback on button
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.classList.add('saving');
    saveBtn.disabled = true;
    
    // Show loading indicator
    document.body.classList.add('loading');
    
    try {
        // Collect form data
        let formData = collectFormData();
        
        // Check if we have a profile picture that needs uploading (data URL)
        const profilePicture = formData.personalInfo.profilePicture;
        if (profilePicture && profilePicture.startsWith('data:image/')) {
            // We need to upload the profile picture first
            console.log('Profile picture is a data URL, uploading before save...');
            
            try {
                // Upload the profile picture
                const imageUrl = await uploadProfilePicture(profilePicture);
                
                if (imageUrl) {
                    console.log('Profile picture uploaded successfully:', imageUrl);
                    // Update the form data with the new URL
                    formData.personalInfo.profilePicture = imageUrl;
                    
                    // Add more detailed logging
                    console.log('Updated form data profile picture URL:', formData.personalInfo.profilePicture);
                } else {
                    console.warn('Profile picture upload failed or was cancelled');
                    // Remove the invalid data URL to avoid issues
                    formData.personalInfo.profilePicture = null;
                }
            } catch (uploadError) {
                console.error('Error during profile picture upload:', uploadError);
                // Continue with the save but without the profile picture
                formData.personalInfo.profilePicture = null;
            }
        }
        
        // Now save the CV data
        console.log('Saving CV data to server...');
        const response = await fetch(`/api/cv/${cvId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save CV data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('CV data saved successfully:', data);
        showAlert('CV data saved successfully!', 'success');
        
        // Return the successful result
        return data;
    } catch (error) {
        console.error('Error saving CV data:', error);
        showAlert('Failed to save CV data. Please try again.', 'error');
        throw error; // Re-throw to allow caller to handle the error
    } finally {
        // Always hide the loading indicator
        document.body.classList.remove('loading');
        
        // Reset save button
        const saveBtn = document.getElementById('save-btn');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        saveBtn.classList.remove('saving');
        saveBtn.disabled = false;
    }
}

// Setup modal
function setupModal() {
    const modal = document.getElementById('generate-modal');
    const generateBtn = document.getElementById('generate-btn');
    const confirmBtn = document.getElementById('confirm-generate');
    const cancelBtn = document.getElementById('cancel-generate');
    const closeBtn = document.querySelector('.close-modal');
    
    // Open modal
    generateBtn.addEventListener('click', function() {
        openGenerateModal();
    });
    
    // Close modal
    function closeModal() {
        modal.style.display = 'none';
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Generate CV
    confirmBtn.addEventListener('click', function() {
        generateCV();
    });
    
    // Close when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Open generate modal
function openGenerateModal() {
    // First save the data
    saveCV();
    
    // Then open the modal
    const modal = document.getElementById('generate-modal');
    modal.style.display = 'block';
}

// Generate CV
async function generateCV() {
    const urlParams = new URLSearchParams(window.location.search);
    const cvId = urlParams.get('id');
    
    if (!cvId) {
        showAlert('No CV ID provided.', 'error');
        return;
    }
    
    // Show generating indicator
    document.getElementById('generating-container').style.display = 'block';
    
    try {
        // First save the CV data including handling any profile picture upload
        // This is a critical step to ensure we have the latest data and any profile 
        // picture is properly uploaded and saved
        console.log('Saving CV data before HTML generation...');
        await saveCV();
        
        // Add a small delay to ensure everything is saved
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now generate the HTML
        console.log('Generating HTML...');
        const response = await fetch(`/api/cv/generate-html/${cvId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to generate CV: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('CV generated successfully:', data);
        
        // Hide generating indicator
        document.getElementById('generating-container').style.display = 'none';
        
        // Close modal
        document.getElementById('generate-modal').style.display = 'none';
        
        // Show success message
        showAlert('CV generated successfully!', 'success');
        
        // Redirect to view CV
        if (data.viewUrl) {
            window.open(data.viewUrl, '_blank');
        }
        
        // Update custom URL display if provided
        if (data.customUrl) {
            const urlLink = document.getElementById('custom-url-link');
            const urlContainer = document.getElementById('custom-url-container');
            
            if (urlLink && urlContainer) {
                const baseUrl = window.location.origin;
                const fullUrl = `${baseUrl}${data.customUrl}`;
                urlLink.href = fullUrl;
                urlLink.textContent = fullUrl;
                urlContainer.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error generating CV:', error);
        
        // Hide generating indicator
        document.getElementById('generating-container').style.display = 'none';
        
        // Show error message
        showAlert(`Failed to generate CV: ${error.message}`, 'error');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
        <span class="alert-message">${message}</span>
        <button class="alert-close">&times;</button>
    `;
    
    // Add close functionality
    alertElement.querySelector('.alert-close').addEventListener('click', function() {
        alertElement.remove();
    });
    
    // Add to page
    document.body.appendChild(alertElement);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.remove();
        }
    }, 5000);
}
// Setup animations for metric examples
function setupMetricExampleAnimations() {
    const animatedBoxes = document.querySelectorAll('.metric-example-box.animated');
    
    animatedBoxes.forEach(box => {
        box.addEventListener('mouseenter', function() {
            const counterElement = this.querySelector('.counter');
            if (counterElement) {
                const target = parseInt(counterElement.getAttribute('data-target'));
                const suffix = this.querySelector('.metric-example-suffix')?.textContent || '';
                
                // Reset to zero first
                counterElement.textContent = '0';
                
                // Animate count up
                let current = 0;
                const increment = target / 30; // Divide the animation into 30 steps
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        clearInterval(timer);
                        current = target;
                    }
                    counterElement.textContent = Math.floor(current);
                }, 30);
            }
        });
        
        box.addEventListener('mouseleave', function() {
            const counterElement = this.querySelector('.counter');
            if (counterElement) {
                const target = parseInt(counterElement.getAttribute('data-target'));
                counterElement.textContent = target;
            }
        });
    });
}

// Upload profile picture to server
// This function now handles the profile picture upload process
// and returns a promise that resolves with the image URL
async function uploadProfilePicture(imageDataUrl) {
    if (!imageDataUrl || imageDataUrl.includes('data:image/svg+xml')) {
        console.log('No valid image data to upload');
        return null;
    }
    
    // If it's already a URL (not a data URL), return it
    if (imageDataUrl.startsWith('http')) {
        console.log('Image is already a URL, no upload needed');
        return imageDataUrl;
    }
    
    console.log('Starting profile picture upload process');
    
    try {
        // Convert data URL to blob
        const fetchResponse = await fetch(imageDataUrl);
        const blob = await fetchResponse.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('profileImage', blob, 'profile-image.jpg');
        
        // Upload the profile picture
        console.log('Sending profile picture upload request');
        const response = await fetch('/api/cv/upload-profile-picture', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Failed to upload profile picture. Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Profile picture uploaded successfully:', data.imageUrl);
        
        // Wait a short time to ensure the image is fully processed on the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return the URL of the uploaded image
        return data.imageUrl;
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        showAlert('Failed to upload profile picture. The CV will be saved without the image.', 'warning');
        return null;
    }
}

// Setup profile picture upload, cropping and preview
function setupProfilePicture() {
    const selectImageBtn = document.getElementById('select-image-btn');
    const cropImageBtn = document.getElementById('crop-image-btn');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const fileInput = document.getElementById('profile-upload');
    const previewImg = document.getElementById('profile-preview');
    const cropOverlay = document.querySelector('.crop-overlay');
    
    let originalImage = null;
    let cropStartX = 0;
    let cropStartY = 0;
    let isDragging = false;
    let originalImgObj = new Image();
    
    // Make uploadProfilePicture globally accessible
    window.uploadProfilePicture = uploadProfilePicture;
    
    // Click select image button to trigger file input
    selectImageBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change event
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Check file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                showAlert('Image size exceeds the 2MB limit. Please choose a smaller image.', 'error');
                fileInput.value = '';
                return;
            }
            
            // Read the selected image
            const reader = new FileReader();
            reader.onload = async (e) => {
                // Set preview image
                previewImg.src = e.target.result;
                originalImage = e.target.result;
                
                // Create image object to check dimensions
                originalImgObj.src = e.target.result;
                originalImgObj.onload = () => {
                    // Validate image dimensions
                    if (originalImgObj.width < 150 || originalImgObj.height < 150) {
                        showAlert('Image is too small. Please select an image that is at least 150x150 pixels.', 'warning');
                    }
                };
                
                // Enable crop and remove buttons
                cropImageBtn.disabled = false;
                removeImageBtn.disabled = false;
                
                // Auto-upload the image right away
                try {
                    // Show a loading indicator
                    document.body.classList.add('uploading-image');
                    
                    // Upload the profile picture immediately
                    console.log('Auto-uploading profile picture...');
                    const imageUrl = await uploadProfilePicture(e.target.result);
                    
                    if (imageUrl) {
                        console.log('Profile picture auto-uploaded successfully:', imageUrl);
                        
                        // Update the CV data structure with the new URL
                        if (cvData && cvData.personalInfo) {
                            cvData.personalInfo.profilePicture = imageUrl;
                            console.log('Updated CV data with profile picture URL');
                        }
                        
                        // Save the CV to persist the change
                        await saveCV();
                        
                        // Show success message
                        showAlert('Profile picture uploaded successfully!', 'success');
                    }
                } catch (uploadError) {
                    console.error('Error auto-uploading profile picture:', uploadError);
                    showAlert('Profile picture upload failed. Please try saving the CV manually.', 'warning');
                } finally {
                    // Hide loading indicator
                    document.body.classList.remove('uploading-image');
                }
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Crop button click event
    cropImageBtn.addEventListener('click', () => {
        if (cropOverlay.classList.contains('active')) {
            // Complete crop
            cropOverlay.classList.remove('active');
            cropImageBtn.innerHTML = '<i class="fas fa-crop-alt"></i> Crop';
            
            // Get the current transform of the crop overlay
            const currentTransform = window.getComputedStyle(cropOverlay).transform;
            const matrix = new DOMMatrix(currentTransform);
            const translateX = matrix.m41;
            const translateY = matrix.m42;
            
            // Apply the crop by updating the preview image's position
            previewImg.style.objectPosition = `${-translateX}px ${-translateY}px`;
            
            // Save the CV with the updated image - this will handle the data URL
            saveCV();
        } else {
            // Start crop
            cropOverlay.classList.add('active');
            cropImageBtn.innerHTML = '<i class="fas fa-check"></i> Apply Crop';
            
            // Reset crop position
            cropOverlay.style.transform = 'translate(0, 0)';
        }
    });
    
    // Drag to position the crop overlay
    cropOverlay.addEventListener('mousedown', (e) => {
        if (!cropOverlay.classList.contains('active')) return;
        
        isDragging = true;
        cropStartX = e.clientX;
        cropStartY = e.clientY;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - cropStartX;
        const dy = e.clientY - cropStartY;
        
        const currentTransform = window.getComputedStyle(cropOverlay).transform;
        const matrix = new DOMMatrix(currentTransform);
        
        // Get current translation values
        let currentX = matrix.m41;
        let currentY = matrix.m42;
        
        // Add the delta movement
        cropOverlay.style.transform = `translate(${currentX + dx}px, ${currentY + dy}px)`;
        
        // Update start positions for the next move
        cropStartX = e.clientX;
        cropStartY = e.clientY;
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Remove image button
    removeImageBtn.addEventListener('click', () => {
        previewImg.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23cccccc\' d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z\'/%3E%3C/svg%3E';
        previewImg.style.objectPosition = 'center';
        fileInput.value = '';
        cropImageBtn.disabled = true;
        removeImageBtn.disabled = true;
        cropOverlay.classList.remove('active');
        cropImageBtn.innerHTML = '<i class="fas fa-crop-alt"></i> Crop';
        
        // Save the CV to update the removed image
        saveCV();
    });
}
