// services/templates/htmlTemplate.js
exports.getBaseTemplate = () => {
  return `<!DOCTYPE html>
<html lang="en">
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
transform: translateY(20px);
opacity: 0;
transition: transform 0.5s ease, opacity 0.5s ease, box-shadow 0.3s ease;
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

/* Experience Section */
.experience {
grid-column: span 8;
display: flex;
flex-direction: column;
gap: 24px;
}

.experience-card {
background: white;
border-radius: 16px;
padding: 24px;
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
margin-bottom: 16px;
}

.job-title {
font-size: 1.2rem;
font-weight: 700;
color: var(--primary);
margin-bottom: 4px;
}

.job-company {
font-weight: 500;
color: var(--secondary);
margin-bottom: 12px;
}

.job-date {
color: var(--gray);
font-size: 0.9rem;
text-align: right;
}

.job-description {
font-style: italic;
color: var(--gray);
margin-bottom: 16px;
}

/* Interactive Expandable Bullets */
.achievements {
margin-left: 0;
list-style-type: none;
}

.achievement-item {
margin-bottom: 12px;
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
padding: 12px 16px;
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
gap: 8px;
}

.achievement-title i {
opacity: 0.7;
}

.achievement-toggle {
color: var(--gray);
font-size: 1rem;
width: 24px;
height: 24px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
transition: var(--transition);
}

.achievement-content {
padding: 0 16px;
max-height: 0;
overflow: hidden;
transition: max-height 0.3s ease, padding 0.3s ease;
}

.achievement-content p {
margin-bottom: 12px;
color: var(--dark);
}

.achievement-item.active .achievement-content {
padding: 0 16px 16px;
max-height: 300px;
}

.achievement-item.active .achievement-toggle {
transform: rotate(180deg);
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

.skill-category {
margin-bottom: 24px;
}

.skill-category:last-child {
margin-bottom: 0;
}

.category-name {
font-weight: 600;
color: var(--primary);
margin-bottom: 12px;
font-size: 1.05rem;
display: flex;
align-items: center;
gap: 8px;
}

.category-name i {
color: var(--accent);
}

.skill-item {
margin-bottom: 12px;
}

.skill-item:last-child {
margin-bottom: 0;
}

.skill-info {
display: flex;
justify-content: space-between;
margin-bottom: 6px;
}

.skill-name {
font-weight: 500;
}

.skill-level {
color: var(--gray);
font-size: 0.9rem;
}

.progress-bar {
height: 6px;
background: #e9ecef;
border-radius: 3px;
overflow: hidden;
}

.progress-fill {
height: 100%;
background: linear-gradient(to right, var(--secondary), var(--accent));
border-radius: 3px;
width: 0; /* Start at 0 and animate to full width */
transition: width 1s ease-out;
}

.progress-fill.animate {
width: 100%; /* Will be set by JS to actual percentage */
}

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

.achievement-toggle {
display: none;
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
<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzAwN2VhNyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmZmZmYiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPltJTklUSUFMU108L3RleHQ+PC9zdmc+" alt="[NAME]">
</div>
</div>
</header>

<!-- Profile -->
<section class="profile">
<h2 class="section-title">Professional Profile</h2>
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
<h2 class="section-title">Professional Experience</h2>
[EXPERIENCE]
</main>

<!-- Side Column -->
<aside class="side-column">
<!-- Skills -->
<div class="skills">
<h2 class="section-title">Key Competencies</h2>
[SKILLS]
</div>

<!-- Education and Training -->
<div class="education">
<h2 class="section-title">Education & Certifications</h2>
[EDUCATION]
</div>

<!-- Expertise Areas -->
<div class="languages">
<h2 class="section-title">Expertise Areas</h2>
[LANGUAGES]
</div>
</aside>
</div>

<!-- CV Template Footer -->
<footer class="cv-template-footer">
<p>[NAME] • Professional CV • Updated March 2025</p>
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

// Progress bar animation
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
<html lang="en">
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