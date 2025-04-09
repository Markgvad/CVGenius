// services/templates/htmlTemplate.js
exports.getBaseTemplate = () => {
  return `<!DOCTYPE html>
<html lang="en"><!-- This lang attribute will be updated based on CV language -->
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Modern Resume Template</title>
<style>
:root {
--primary: #003459;
--secondary: #007ea7;
--accent: #00a8e8;
--light: #f8f9fa;
--dark: #212529;
--gray: #6c757d;
--border: #dee2e6;
--card-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08);
--transition: all 0.25s ease;
}

* {
margin: 0;
padding: 0;
box-sizing: border-box;
font-family: 'Roboto', 'Inter', 'Segoe UI', sans-serif;
}
body {
background-color: var(--light);
color: var(--dark);
line-height: 1.6;
font-size: 16px;
}

.page {
max-width: 1140px;
margin: 2rem auto;
display: grid;
grid-template-columns: repeat(12, 1fr);
grid-gap: 24px;
padding: 0 24px;
}

/* Header Area */
.header {
grid-column: span 12;
display: grid;
grid-template-columns: repeat(12, 1fr);
grid-gap: inherit;
margin-bottom: 24px;
}

.identity {
grid-column: span 8;
display: flex;
flex-direction: column;
justify-content: center;
}

.name {
font-size: 3rem;
font-weight: 700;
letter-spacing: -1px;
color: var(--primary);
line-height: 1.2;
margin-bottom: 8px;
}

.profession {
font-size: 1.25rem;
color: var(--secondary);
margin-bottom: 16px;
font-weight: 500;
}

.contact {
display: flex;
flex-wrap: wrap;
gap: 16px;
}

.contact-item {
display: flex;
align-items: center;
gap: 8px;
color: var(--gray);
transition: var(--transition);
}

.contact-item:hover {
color: var(--accent);
transform: translateY(-2px);
}

.contact-item i {
color: var(--secondary);
}

.photo {
grid-column: span 4;
display: flex;
justify-content: flex-end;
align-items: center;
}

.photo-frame {
width: 160px;
height: 160px;
border-radius: 50%;
overflow: hidden;
border: 4px solid white;
box-shadow: var(--card-shadow);
}

.photo-frame img {
width: 100%;
height: 100%;
object-fit: cover;
}

/* Profile Area */
.profile {
grid-column: span 12;
background-color: white;
border-radius: 16px;
padding: 24px;
box-shadow: var(--card-shadow);
margin-bottom: 24px;
}

.section-title {
font-size: 1.25rem;
font-weight: 700;
color: var(--primary);
margin-bottom: 16px;
padding-bottom: 8px;
border-bottom: 2px solid var(--accent);
display: inline-block;
}

.profile-content {
font-size: 1.1rem;
color: var(--dark);
line-height: 1.7;
}

/* Metrics Grid */
.metrics {
grid-column: span 12;
display: grid;
grid-template-columns: repeat(4, 1fr);
grid-gap: 24px;
margin-bottom: 40px;
margin-top: 24px;
}

.metric-card {
background: white;
border-radius: 16px;
padding: 24px;
box-shadow: var(--card-shadow);
text-align: center;
position: relative;
overflow: hidden;
transition: var(--transition);
border-top: 4px solid var(--accent);
transform: translateY(0);
opacity: 0;
transition: transform 0.3s ease, opacity 0.5s ease, box-shadow 0.3s ease;
}

.metric-card.visible {
transform: translateY(0);
opacity: 1;
}

.metric-card:hover {
transform: translateY(-5px);
box-shadow: 0 8px 15px rgba(0,0,0,0.1);
}

.metric-icon {
position: absolute;
top: 10px;
right: 10px;
font-size: 20px;
color: var(--accent);
opacity: 0.2;
}

.metric-value {
font-size: 2.5rem;
font-weight: 700;
color: var(--primary);
line-height: 1.2;
margin-bottom: 8px;
}

.metric-label {
color: var(--gray);
font-size: 0.95rem;
}

/* Experience Section - ENHANCED FOR TIGHTER SPACING */
.experience {
grid-column: span 8;
display: flex;
flex-direction: column;
gap: 16px;
}

.experience-card {
background: white;
border-radius: 16px;
padding: 16px;
box-shadow: var(--card-shadow);
transition: var(--transition);
position: relative;
overflow: hidden;
}

.experience-card:hover {
transform: translateY(-3px);
box-shadow: 0 8px 15px rgba(0,0,0,0.08);
}

.experience-card::before {
content: "";
position: absolute;
top: 0;
left: 0;
height: 100%;
width: 4px;
background: var(--accent);
}

.job-header {
display: grid;
grid-template-columns: 1fr auto;
margin-bottom: 0; /* Reduced from 12px */
}

.job-title {
font-size: 1.1rem;
font-weight: 700;
color: var(--primary);
margin-bottom: 2px;
}

.job-company {
font-weight: 500;
color: var(--secondary);
margin-bottom: 0;
}

.job-date {
color: var(--gray);
font-size: 0.85rem;
text-align: right;
}

.job-description {
font-style: italic;
color: var(--gray);
margin-bottom: 12px;
}

/* Interactive Expandable Bullets */
.achievements {
margin-left: 0;
list-style-type: none;
}

.achievement-item {
margin-bottom: 10px;
border-radius: 8px;
overflow: hidden;
border: 1px solid var(--border);
transition: var(--transition);
opacity: 0;
transform: translateX(-20px);
transition: opacity 0.5s ease, transform 0.5s ease;
}

.achievement-item.visible {
opacity: 1;
transform: translateX(0);
}

.achievement-item:last-child {
margin-bottom: 0;
}

.achievement-item:hover {
box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.achievement-header {
padding: 10px 14px;
display: flex;
justify-content: space-between;
align-items: center;
cursor: pointer;
background-color: white;
transition: var(--transition);
}

.achievement-header:hover {
background-color: rgba(0, 168, 232, 0.05);
}

.achievement-title {
font-weight: 600;
color: var(--primary);
display: flex;
align-items: center;
font-size: 0.95rem;
}

.achievement-toggle {
color: var(--gray);
font-size: 0.9rem;
width: 22px;
height: 22px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
transition: var(--transition);
}

.achievement-content {
padding: 0 14px;
max-height: 0;
overflow: hidden;
transition: max-height 0.3s ease, padding 0.3s ease;
}

.achievement-content p {
margin-bottom: 12px;
color: var(--dark);
white-space: pre-wrap;
font-size: 0.95rem;
}

.achievement-content ul {
margin-bottom: 12px;
margin-left: 20px;
list-style-type: disc;
color: var(--dark);
}

.achievement-item.active .achievement-content {
padding: 0 14px 14px;
max-height: 300px;
}

.achievement-item.active .achievement-toggle {
transform: rotate(180deg);
}

/* Job achievements toggle button - MORE DISCRETE STYLING */
.achievements-section {
padding: 0;
max-height: 0;
overflow: hidden;
transition: max-height 0.5s ease, padding 0.3s ease;
margin-top: 0;
}

.show-achievements-btn {
margin-top: 6px;
padding: 4px 10px;
background-color: transparent;
border: 1px solid var(--border);
border-radius: 12px;
color: var(--gray);
font-size: 0.75rem;
cursor: pointer;
transition: var(--transition);
display: flex;
align-items: center;
justify-content: center;
gap: 6px;
width: auto;
margin-left: auto;
opacity: 0.75;
}

.show-achievements-btn:hover {
background-color: rgba(0, 168, 232, 0.08);
color: var(--secondary);
opacity: 1;
}

.show-achievements-btn i {
transition: transform 0.3s ease;
font-size: 0.7rem;
}

.job-expanded .show-achievements-btn i {
transform: rotate(180deg);
}

.job-expanded .achievements-section {
max-height: 2000px; /* Large enough to fit all content */
padding: 10px 0;
}

/* Side Column */
.side-column {
grid-column: span 4;
display: flex;
flex-direction: column;
gap: 24px;
}

.skills, .education, .languages {
background: white;
border-radius: 16px;
padding: 24px;
box-shadow: var(--card-shadow);
}

/* ENHANCED SKILL CATEGORY STYLES - START */
.skill-category {
margin-bottom: 18px;
border-radius: 12px;
border: 1px solid rgba(0,0,0,0.05);
box-shadow: 0 2px 4px rgba(0,0,0,0.03);
overflow: hidden;
transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.skill-category:hover {
box-shadow: 0 4px 8px rgba(0,0,0,0.08);
transform: translateY(-2px);
}

.skill-category:last-child {
margin-bottom: 0;
}

.skill-category.active {
border-color: var(--accent);
}

.category-header {
font-weight: 600;
color: var(--primary);
margin-bottom: 0;
font-size: 1.1rem;
display: flex;
align-items: center;
justify-content: space-between;
cursor: pointer;
padding: 14px 18px;
transition: var(--transition);
background: linear-gradient(to right, rgba(0,52,89,0.03), rgba(0,126,167,0.05));
border-bottom: 1px solid transparent;
}

.skill-category.active .category-header {
border-bottom-color: rgba(0,168,232,0.1);
background: linear-gradient(to right, rgba(0,52,89,0.08), rgba(0,126,167,0.1));
}

.category-name {
display: flex;
align-items: center;
gap: 12px;
font-weight: 600;
color: var(--primary);
}

.category-name i {
color: var(--accent);
font-size: 1.2rem;
background: rgba(0,168,232,0.1);
padding: 8px;
border-radius: 8px;
transition: all 0.3s ease;
}

.skill-category:hover .category-name i {
transform: scale(1.1);
background: rgba(0,168,232,0.2);
}

.category-toggle {
color: var(--gray);
font-size: 1rem;
width: 24px;
height: 24px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
transition: var(--transition);
background: rgba(255,255,255,0.8);
}

.category-content {
max-height: 0;
overflow: hidden;
transition: max-height 0.3s ease, padding 0.3s ease;
padding: 0 16px;
}

/* Always show the category progress container even when collapsed */
.category-progress-container {
padding: 16px 16px 0;
margin-bottom: 0 !important;
}

.skill-category.active .category-content {
max-height: 1000px;
padding: 12px;
}

/* REMOVED BLUE BACKGROUND FROM EXPANDED TOGGLE */
.skill-category.active .category-toggle {
transform: rotate(180deg);
background: transparent;
color: var(--primary);
}

/* UPDATED SKILL ITEM STYLES - TIGHTER SPACING, NO BACKGROUND */
.skill-item {
margin-bottom: 8px;
padding: 3px 0;
transition: all 0.2s ease;
}

.skill-item:last-child {
margin-bottom: 0;
}

.skill-info {
display: flex;
justify-content: space-between;
margin-bottom: 5px;
}

.skill-name {
font-weight: 500;
}

.skill-level {
color: var(--accent);
font-size: 0.8rem;
font-weight: 600;
background: rgba(0,168,232,0.1);
padding: 2px 8px;
border-radius: 12px;
}

.progress-bar {
height: 6px;
background: #e9ecef;
border-radius: 4px;
overflow: hidden;
}

.category-progress-container .progress-bar {
height: 12px;
border-radius: 6px;
box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.category-progress-container .progress-fill {
background: linear-gradient(to right, var(--primary), var(--accent));
box-shadow: 0 1px 3px rgba(0,168,232,0.3);
}

.progress-fill {
height: 100%;
background: linear-gradient(to right, var(--secondary), var(--accent));
border-radius: 4px;
width: 0; /* Start at 0 and animate to full width */
transition: width 1s ease-out;
position: relative;
}

.progress-fill:after {
content: "";
position: absolute;
top: 0;
right: 0;
bottom: 0;
width: 5px;
background: rgba(255,255,255,0.5);
border-radius: 50%;
animation: pulse 1.5s infinite;
display: none;
}

.progress-fill.animate:after {
display: block;
}

@keyframes pulse {
0% { opacity: 0.2; }
50% { opacity: 0.8; }
100% { opacity: 0.2; }
}
/* ENHANCED SKILL CATEGORY STYLES - END */

.course-item {
margin-bottom: 16px;
padding-bottom: 16px;
border-bottom: 1px solid var(--border);
}

.course-item:last-child {
margin-bottom: 0;
padding-bottom: 0;
border-bottom: none;
}

.course-name {
font-weight: 600;
color: var(--primary);
margin-bottom: 4px;
}

.course-provider {
color: var(--gray);
font-size: 0.9rem;
margin-bottom: 4px;
}

.course-year {
color: var(--accent);
font-size: 0.8rem;
font-weight: 500;
}

.course-grade {
display: inline-block;
background: var(--light);
padding: 2px 8px;
border-radius: 4px;
font-size: 0.75rem;
color: var(--secondary);
margin-top: 4px;
}

.language-item {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 16px;
padding-bottom: 16px;
border-bottom: 1px solid var(--border);
}

.language-item:last-child {
margin-bottom: 0;
padding-bottom: 0;
border-bottom: none;
}

.language-name {
font-weight: 500;
}

.language-proficiency {
background: var(--light);
padding: 4px 12px;
border-radius: 20px;
font-size: 0.85rem;
color: var(--secondary);
}

/* CV Template Footer */
.cv-template-footer {
text-align: center;
padding: 20px 0;
color: var(--gray);
font-size: 0.85rem;
margin-top: 30px;
border-top: 1px solid var(--border);
background-color: #f9f9f9;
}

.cv-template-footer p {
max-width: 1140px;
margin: 0 auto;
padding: 0 24px;
}

/* Responsive Design */
@media (max-width: 992px) {
.page {
grid-gap: 20px;
}

.metrics {
grid-template-columns: repeat(2, 1fr);
}

.experience {
grid-column: span 12;
margin-bottom: 24px;
}

.side-column {
grid-column: span 12;
display: grid;
grid-template-columns: repeat(3, 1fr);
}

.skills, .education, .languages {
grid-column: span 1;
}
}

@media (max-width: 768px) {
.header {
grid-template-columns: 1fr;
}

.identity, .photo {
grid-column: span 12;
justify-content: center;
text-align: center;
}

.contact {
justify-content: center;
}

.photo {
margin-top: 24px;
}

.side-column {
grid-template-columns: 1fr;
}

.skills, .education, .languages {
grid-column: span 1;
}

.achievement-header {
flex-direction: column;
align-items: flex-start;
gap: 8px;
position: relative;
}

.achievement-title {
font-size: 0.95rem;
padding-right: 30px;
}

.achievement-toggle {
position: absolute;
right: 16px;
top: 12px;
}
}

@media (max-width: 576px) {
.metrics {
grid-template-columns: 1fr;
}

.page {
padding: 0 16px;
margin: 1rem auto;
}

.name {
font-size: 2.5rem;
}
}

@media print {
body {
background-color: white;
}

.page {
margin: 0;
max-width: 100%;
}

.experience-card:hover, .metric-card:hover, .achievement-item:hover {
transform: none;
box-shadow: var(--card-shadow);
}

.achievement-content {
max-height: none !important;
padding: 0 16px 16px !important;
}

.achievement-content p {
white-space: pre-wrap !important;
}

.achievement-toggle, .category-toggle, .show-achievements-btn {
display: none !important;
}

/* Make sure all content is visible for print */

.category-content, .achievements-section {
max-height: none !important;
padding: 16px 0 !important;
}

/* Force all job cards to show achievements in print */
.experience-card {
position: relative;
}

.experience-card.job-expanded .achievements-section,
.experience-card .achievements-section {
max-height: none !important;
padding: 16px 0 !important;
display: block !important;
}

/* Make sure everything is visible for print */
.achievement-item {
opacity: 1 !important;
transform: translateX(0) !important;
}

.metric-card {
opacity: 1 !important;
transform: translateY(0) !important;
}

.progress-fill {
width: 100% !important;
}

.cv-template-footer {
display: none;
}
}
</style>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
</head>

<body>
<div class="page" id="cv-container" data-cv-id="[URL_ID]">
<!-- Header -->
<header class="header">
<div class="identity">
<h1 class="name">[NAME]</h1>
<div class="profession">[TITLE]</div>
<div class="contact">
[CONTACT_ITEMS]
</div>
</div>
<div class="photo">
<div class="photo-frame">
<img src="[PROFILE_PICTURE]" alt="[NAME]">
</div>
</div>
</header>

<!-- Profile -->
<section class="profile">
<h2 class="section-title">[SECTION_PROFILE]</h2>
<div class="profile-content">
[PROFILE]
</div>
</section>

<!-- Metrics Grid -->
<div class="metrics">
[METRICS]
</div>

<!-- Main Content Area -->
<main class="experience">
<h2 class="section-title">[SECTION_EXPERIENCE]</h2>
[EXPERIENCE]
</main>

<!-- Side Column -->
<aside class="side-column">
<!-- Skills -->
<div class="skills">
<h2 class="section-title">[SECTION_SKILLS]</h2>
[SKILLS]
</div>

<!-- Education and Training -->
<div class="education">
<h2 class="section-title">[SECTION_EDUCATION]</h2>
[EDUCATION]
</div>

<!-- Languages -->
<div class="languages">
<h2 class="section-title">[SECTION_LANGUAGES]</h2>
[LANGUAGES]
</div>
</aside>
</div>

<!-- CV Template Footer -->
<footer class="cv-template-footer">
<p><a href="https://cvgenius.net" target="_blank" style="color: var(--gray); text-decoration: none; border-bottom: 1px dotted var(--gray);">CVgenius.net</a></p>
</footer>

<script>
document.addEventListener('DOMContentLoaded', function() {
// Handle achievement item expanding/collapsing
const achievementHeaders = document.querySelectorAll('.achievement-header');
achievementHeaders.forEach(header => {
    header.addEventListener('click', function() {
        const item = this.parentElement;
        item.classList.toggle('active');
    });
});

// Handle job achievements toggle
const achievementButtons = document.querySelectorAll('.show-achievements-btn');
achievementButtons.forEach(button => {
    button.addEventListener('click', function() {
        const jobCard = this.closest('.experience-card');
        jobCard.classList.toggle('job-expanded');
        
        // Update button text
        if (jobCard.classList.contains('job-expanded')) {
            this.innerHTML = '<i class="fas fa-chevron-up"></i> [TEXT_HIDE_DETAILS]';
        } else {
            this.innerHTML = '<i class="fas fa-chevron-down"></i> [TEXT_VIEW_DETAILS]';
        }
    });
});

// Handle skill category expanding/collapsing
const categoryHeaders = document.querySelectorAll('.category-header');
categoryHeaders.forEach(header => {
    header.addEventListener('click', function() {
        const category = this.closest('.skill-category');
        category.classList.toggle('active');
        
        // If the category is being opened, trigger animation of progress bars inside it
        if (category.classList.contains('active')) {
            const progressBars = category.querySelectorAll('.progress-fill');
            progressBars.forEach(bar => {
                const width = bar.getAttribute('data-width');
                // Set a small timeout to ensure the category is fully expanded first
                setTimeout(() => {
                    bar.style.width = width;
                    bar.classList.add('animate');
                }, 50);
            });
        }
    });
});

// Function to animate counting up
function animateValue(obj, start, end, duration, suffix) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let value = Math.floor(progress * (end - start) + start);
        obj.innerHTML = value + suffix;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Intersection Observer for scroll animations
const observerOptions = {
    root: null, // viewport
    rootMargin: '0px',
    threshold: 0.1 // 10% of the item is visible
};

// Metric cards animation with counting effect
const metricCards = document.querySelectorAll('.metric-card');
const metricObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const card = entry.target;
            card.classList.add('visible');
            // Get the value element inside this card
            const valueElement = card.querySelector('.metric-value');
            if (valueElement) {
                const targetValue = parseInt(valueElement.getAttribute('data-value'));
                const suffix = valueElement.getAttribute('data-suffix');
                // Animate from 0 to target value over 2 seconds
                animateValue(valueElement, 0, targetValue, 2000, suffix);
            }
            observer.unobserve(card); // Only animate once
        }
    });
}, observerOptions);

metricCards.forEach(card => {
    metricObserver.observe(card);
});

// Progress bar animation - more aggressive to ensure all bars show
const progressBars = document.querySelectorAll('.progress-fill');
const progressObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressBar = entry.target;
            const width = progressBar.getAttribute('data-width');
            progressBar.style.width = width;
            progressBar.classList.add('animate');
            observer.unobserve(progressBar); // Only animate once
        }
    });
}, observerOptions);

// Immediately set all category progress bars on page load
document.querySelectorAll('.category-progress-container .progress-fill').forEach(bar => {
    const width = bar.getAttribute('data-width');
    // Small delay to ensure the CSS transition works
    setTimeout(() => {
        bar.style.width = width;
        bar.classList.add('animate');
    }, 300);
});

progressBars.forEach(bar => {
    progressObserver.observe(bar);
});

// Achievement items animation
const achievementItems = document.querySelectorAll('.achievement-item');
const itemObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Add a small delay for each item to create a cascade effect
            const item = entry.target;
            const index = Array.from(item.parentNode.children).indexOf(item);
            setTimeout(() => {
                item.classList.add('visible');
            }, index * 100); // 100ms delay between items
            observer.unobserve(item); // Only animate once
        }
    });
}, observerOptions);

achievementItems.forEach(item => {
    itemObserver.observe(item);
});
});
</script>
</body>
</html>`;
};

// Print-friendly template version (simplified CSS for printing)
exports.getPrintFriendlyTemplate = () => {
  return `<!DOCTYPE html>
<html lang="en"><!-- This lang attribute will be updated based on CV language -->
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Print-Friendly CV</title>
<style>
  /* Print-optimized styles */
  body {
    font-family: 'Arial', sans-serif;
    line-height: 1.5;
    color: #333;
    margin: 0;
    padding: 0;
  }
  
  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  /* Continue with print-friendly styles */
  /* ... */
</style>
</head>
<body>
<!-- Print-friendly template content -->
<!-- ... -->
</body>
</html>`;
};