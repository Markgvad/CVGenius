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
    fetch(`/api/cv-meta/${cvId}`)
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
    
    // Personal Info
    document.getElementById('name').value = data.personalInfo?.name || '';
    document.getElementById('title').value = data.personalInfo?.title || '';
    document.getElementById('email').value = data.personalInfo?.email || '';
    document.getElementById('phone').value = data.personalInfo?.phone || '';
    document.getElementById('linkedin').value = data.personalInfo?.linkedin || '';
    document.getElementById('location').value = data.personalInfo?.location || '';
    
    // Profile
    document.getElementById('profile-text').value = data.profile || '';
    
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
    
    // Add Experience
    document.getElementById('add-experience').addEventListener('click', function() {
        addExperience();
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
function addExperience(data = null) {
    const experienceContainer = document.getElementById('experience-container');
    const template = document.getElementById('experience-template');
    const experienceElement = document.importNode(template.content, true);
    
    // Set values if data provided
    if (data) {
        experienceElement.querySelector('.experience-title').value = data.title || '';
        experienceElement.querySelector('.experience-company').value = data.company || '';
        experienceElement.querySelector('.experience-start-date').value = data.startDate || '';
        experienceElement.querySelector('.experience-end-date').value = data.endDate || '';
        
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
    
    // Setup delete button
    experienceElement.querySelector('.delete-btn').addEventListener('click', function() {
        this.closest('.experience-item').remove();
    });
    
    experienceContainer.appendChild(experienceElement);
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
    
    // Set values if data provided
    if (data) {
        categoryElement.querySelector('.skill-category-name').value = data.name || '';
        categoryElement.querySelector('.skill-category-icon').value = data.icon || '';
        
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
    categoryElement.querySelector('.delete-btn').addEventListener('click', function() {
        this.closest('.skill-category-item').remove();
    });
    
    skillsContainer.appendChild(categoryElement);
}

// Add a new skill
function addSkill(container, data = null) {
    const template = document.getElementById('skill-item-template');
    const skillElement = document.importNode(template.content, true);
    
    // Set values if data provided
    if (data) {
        skillElement.querySelector('.skill-name').value = data.name || '';
        
        const selectElement = skillElement.querySelector('.skill-level');
        const level = data.level || 'Intermediate';
        
        // Find and select the matching option
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === level) {
                selectElement.selectedIndex = i;
                break;
            }
        }
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
        
        const selectElement = languageElement.querySelector('.language-proficiency');
        const proficiency = data.proficiency || 'Proficient';
        
        // Find and select the matching option
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === proficiency) {
                selectElement.selectedIndex = i;
                break;
            }
        }
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
    
    const formData = {
        personalInfo: {
            name: document.getElementById('name').value,
            title: document.getElementById('title').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            linkedin: document.getElementById('linkedin').value,
            location: document.getElementById('location').value
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
        const categoryData = {
            name: item.querySelector('.skill-category-name').value,
            icon: item.querySelector('.skill-category-icon').value,
            skills: []
        };
        
        // Collect skills in category
        item.querySelectorAll('.skill-item').forEach(skill => {
            categoryData.skills.push({
                name: skill.querySelector('.skill-name').value,
                level: skill.querySelector('.skill-level').value
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
function saveCV() {
    const formData = collectFormData();
    const urlParams = new URLSearchParams(window.location.search);
    const cvId = urlParams.get('id');
    
    if (!cvId) {
        showAlert('No CV ID provided.', 'error');
        return;
    }
    
    // Show loading indicator
    document.body.classList.add('loading');
    
    fetch(`/api/cv/${cvId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to save CV data: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('CV data saved successfully:', data);
            showAlert('CV data saved successfully!', 'success');
            document.body.classList.remove('loading');
        })
        .catch(error => {
            console.error('Error saving CV data:', error);
            showAlert('Failed to save CV data. Please try again.', 'error');
            document.body.classList.remove('loading');
        });
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
function generateCV() {
    const urlParams = new URLSearchParams(window.location.search);
    const cvId = urlParams.get('id');
    
    if (!cvId) {
        showAlert('No CV ID provided.', 'error');
        return;
    }
    
    // Show generating indicator
    document.getElementById('generating-container').style.display = 'block';
    
    fetch(`/api/generate-html/${cvId}`, {
        method: 'POST'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to generate CV: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
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
                    urlLink.href = data.customUrl;
                    urlLink.textContent = data.customUrl;
                    urlContainer.style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Error generating CV:', error);
            
            // Hide generating indicator
            document.getElementById('generating-container').style.display = 'none';
            
            // Show error message
            showAlert('Failed to generate CV. Please try again.', 'error');
        });
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