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
    
    // Personal Info
    document.getElementById('name').value = data.personalInfo?.name || '';
    document.getElementById('title').value = data.personalInfo?.title || '';
    document.getElementById('email').value = data.personalInfo?.email || '';
    document.getElementById('phone').value = data.personalInfo?.phone || '';
    document.getElementById('linkedin').value = data.personalInfo?.linkedin || '';
    document.getElementById('location').value = data.personalInfo?.location || '';
    
    // Profile Picture
    if (data.personalInfo?.profilePicture) {
        console.log("Loading profile picture from data:", data.personalInfo.profilePicture.substring(0, 50) + "...");
        const profilePreview = document.getElementById('profile-preview');
        profilePreview.src = data.personalInfo.profilePicture;
        document.getElementById('crop-image-btn').disabled = false;
        document.getElementById('remove-image-btn').disabled = false;
        
        // Check if image loads correctly
        profilePreview.onload = function() {
            console.log("Profile picture loaded successfully");
        };
        
        profilePreview.onerror = function() {
            console.error("Error loading profile picture, reverting to placeholder");
            profilePreview.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23cccccc\' d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z\'/%3E%3C/svg%3E';
        };
    }
    
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
    
    // Get elements
    const slider = skillElement.querySelector('.skill-level-slider');
    const valueDisplay = skillElement.querySelector('.skill-level-value');
    const selectElement = skillElement.querySelector('.skill-level');
    
    // Update the select value based on slider value
    function updateSkillLevel(value) {
        valueDisplay.textContent = value + '%';
        
        // Map percentage to skill level
        let level;
        if (value < 20) level = 'Beginner';
        else if (value < 40) level = 'Basic';
        else if (value < 60) level = 'Intermediate';
        else if (value < 80) level = 'Advanced';
        else level = 'Expert';
        
        // Set the hidden select
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === level) {
                selectElement.selectedIndex = i;
                break;
            }
        }
    }
    
    // Add event listener to slider
    slider.addEventListener('input', function() {
        updateSkillLevel(this.value);
    });
    
    // Set values if data provided
    if (data) {
        skillElement.querySelector('.skill-name').value = data.name || '';
        
        const level = data.level || 'Intermediate';
        
        // Find matching option and set the slider value accordingly
        let percentValue = 50; // Default (Intermediate)
        
        switch(level) {
            case 'Beginner': percentValue = 10; break;
            case 'Basic': percentValue = 30; break;
            case 'Intermediate': percentValue = 50; break;
            case 'Advanced': percentValue = 70; break;
            case 'Expert': percentValue = 90; break;
        }
        
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
    
    // Get profile picture - handle both data URLs and regular URLs
    const profilePreview = document.getElementById('profile-preview');
    let profilePicture = null;
    
    if (profilePreview && profilePreview.src) {
        // Check if it's not the default placeholder SVG
        if (!profilePreview.src.includes('data:image/svg+xml')) {
            profilePicture = profilePreview.src;
            console.log('Collecting profile picture:', profilePicture.substring(0, 50) + '...');
        }
    }
    
    const formData = {
        personalInfo: {
            name: document.getElementById('name').value,
            title: document.getElementById('title').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            linkedin: document.getElementById('linkedin').value,
            location: document.getElementById('location').value,
            profilePicture: profilePicture
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
async function saveCV() {
    let formData = collectFormData();
    const urlParams = new URLSearchParams(window.location.search);
    const cvId = urlParams.get('id');
    
    if (!cvId) {
        showAlert('No CV ID provided.', 'error');
        return;
    }
    
    // Show loading indicator
    document.body.classList.add('loading');
    
    // Handle profile picture upload if it's a data URL
    const profilePicture = formData.personalInfo.profilePicture;
    console.log("Saving CV with profile picture:", profilePicture ? (profilePicture.substring(0, 30) + "...") : "none");
    
    if (profilePicture && profilePicture.startsWith('data:image/')) {
        try {
            console.log("Uploading data URL profile picture to server");
            const imageUrl = await uploadProfilePicture(profilePicture);
            console.log("Profile picture uploaded, received URL:", imageUrl ? (imageUrl.substring(0, 30) + "...") : "none");
            
            // Update the form data with the new URL or keep the data URL if upload failed
            if (imageUrl) {
                formData.personalInfo.profilePicture = imageUrl;
            } else {
                console.log("Using original data URL as upload failed");
                // Keep the original data URL if the upload failed
                formData.personalInfo.profilePicture = profilePicture;
            }
        } catch (error) {
            console.error('Error handling profile picture upload:', error);
            // Keep the original data URL if there was an error
            formData.personalInfo.profilePicture = profilePicture;
        }
    }
    
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
    
    fetch(`/api/cv/generate-html/${cvId}`, {
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
async function uploadProfilePicture(imageDataUrl) {
    if (!imageDataUrl || imageDataUrl.includes('data:image/svg+xml')) {
        return null;
    }
    
    // If it's already a URL (not a data URL) or an already processed data URL from server, return it
    if (imageDataUrl.startsWith('http') || 
        (imageDataUrl.startsWith('data:') && imageDataUrl.length > 1000)) { // Longer data URLs likely processed
        console.log("Image already processed, returning as-is");
        return imageDataUrl;
    }
    
    try {
        console.log("Converting data URL to blob for upload");
        // Convert data URL to blob
        const fetchResponse = await fetch(imageDataUrl);
        const blob = await fetchResponse.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('profileImage', blob, 'profile-image.jpg');
        
        console.log("Sending POST request to upload profile picture");
        const response = await fetch('/api/cv/upload-profile-picture', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            console.warn(`Upload failed with status: ${response.status}`);
            throw new Error('Failed to upload profile picture');
        }
        
        const data = await response.json();
        console.log('Profile picture uploaded successfully');
        
        // Return the image URL (which now comes from the server)
        return data.imageUrl;
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        showAlert('Problem uploading profile picture. The image will be saved as-is.', 'warning');
        // Return the original data URL instead of null to preserve the image
        return imageDataUrl;
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
            reader.onload = (e) => {
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
