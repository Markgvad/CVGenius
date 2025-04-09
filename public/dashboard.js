// Dashboard Analytics and Subscription Management
async function setupAnalytics() {
  try {
    const response = await fetch('/api/payments/subscription-status');
    const data = await response.json();
    
    const analyticsContainer = document.querySelector('.analytics-container');
    
    if (!data.hasAnalytics) {
      analyticsContainer.innerHTML = `
        <div class="upgrade-card">
          <h3>Detailed Analytics</h3>
          <p>Upgrade to our Premium plan to access detailed analytics for your CVs.</p>
          <button id="upgrade-analytics-btn" class="btn btn-primary">Upgrade to Premium</button>
        </div>
      `;
      
      document.getElementById('upgrade-analytics-btn').addEventListener('click', () => {
        window.location.href = '/pricing.html';
      });
    } else {
      // Load detailed analytics for premium users
      console.log('Premium user detected, loading detailed analytics');
    }
    
    // Always load user CVs regardless of subscription tier
    loadUserCVs(); // Load CVs for both free and premium users
  } catch (error) {
    console.error('Failed to setup analytics:', error);
  }
}

// Load subscription info for dashboard
async function loadSubscriptionStatus() {
  try {
    const response = await fetch('/api/payments/subscription-status');
    
    if (!response.ok) {
      console.error('Error fetching subscription status:', response.statusText);
      return;
    }
    
    const data = await response.json();
    
    // Update subscription badge
    const badge = document.getElementById('subscriptionBadge');
    if (badge) {
      let tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
      badge.textContent = `${tierName} Plan`;
      
      // Set badge color
      if (data.tier === 'premium') {
        badge.classList.add('premium-badge');
      } else if (data.tier === 'standard') {
        badge.classList.add('standard-badge');
      }
    }
    
    // Update the existing subscription status card
    const statusElement = document.getElementById('subscription-status');
    if (statusElement) {
      let tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
      let expiry = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'N/A';
      
      statusElement.innerHTML = `
        <div class="card-title">
          <h2>Subscription</h2>
          <i class="fas fa-star"></i>
        </div>
        <p><strong>Plan:</strong> ${tierName}</p>
        <p><strong>Expires:</strong> ${expiry}</p>
        <p><strong>CVs Allowed:</strong> ${data.allowedCVs}</p>
        <p><strong>Analytics:</strong> ${data.hasAnalytics ? 'Yes' : 'No'}</p>
        ${data.tier !== 'premium' ? 
          '<a href="/pricing.html" class="cv-btn cv-btn-primary" style="display: inline-block; margin-top: 1rem;">Upgrade Plan</a>' : 
          ''}
      `;
    }
    
    // Update user info
    const userNameElement = document.getElementById('userName');
    if (userNameElement && !userNameElement.textContent || userNameElement.textContent === 'User') {
      try {
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userNameElement.textContent = userData.name;
        }
      } catch (userError) {
        console.error('Failed to load user data:', userError);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Failed to load subscription status:', error);
  }
}

// Make sure the expandable panel body is properly initialized
function ensureExpandablePanels() {
  // Find all expanded panels
  document.querySelectorAll('.analytics-panel.expanded').forEach(panel => {
    // Make sure the body has a high max-height
    const body = panel.querySelector('.analytics-panel-body');
    if (body) {
      body.style.maxHeight = '2000px';
    }
  });
}

// Modified initialization to handle user's CVs
async function initializeDashboard() {
  try {
    // First load the subscription status
    const subscriptionData = await loadSubscriptionStatus();
    
    // Then setup analytics
    await setupAnalytics();
    
    // Check directly from the subscription data if user has analytics access
    // This avoids needing to call the checkAnalyticsAccess function from the inline script
    const hasAnalyticsAccess = subscriptionData && subscriptionData.hasAnalytics;
    
    // Show appropriate analytics UI
    if (hasAnalyticsAccess) {
      document.getElementById('analytics-section').style.display = 'block';
      document.querySelector('.analytics-container').style.display = 'none';
      document.querySelector('.modern-analytics-container').style.display = 'block';
      document.getElementById('analytics-upgrade-cta').style.display = 'none';
      try {
        loadAnalytics();
        // Wait briefly to ensure analytics are loaded before initializing panels
        setTimeout(() => {
          if (typeof initExpandablePanels === 'function') {
            initExpandablePanels();
          }
        }, 500);
      } catch (analyticsError) {
        console.error('Error loading analytics:', analyticsError);
      }
    } else {
      document.getElementById('analytics-section').style.display = 'none';
      document.getElementById('analytics-upgrade-cta').style.display = 'block';
    }

    // Load and display user's CVs
    const response = await fetch('/api/cv/user/cvs');
    if (response.ok) {
      const cvsData = await response.json();
      
      // Update CV count
      document.getElementById('cvCount').textContent =
          `You have ${cvsData.length} CV${cvsData.length !== 1 ? 's' : ''}`;

      // Show empty state if no CVs
      if (cvsData.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
      } else {
        // Render CV list
        const cvListEl = document.getElementById('cvList');

        // Clear existing content except the "Create New CV" button
        const createCvButton = cvListEl.querySelector('.create-cv');
        cvListEl.innerHTML = '';
        cvListEl.appendChild(createCvButton);

        // Add CV cards
        cvsData.forEach(cv => {
          const cvCard = document.createElement('div');
          cvCard.className = 'cv-card';
          cvCard.setAttribute('data-cv-id', cv.urlId);

          const uploadDate = new Date(cv.uploadDate).toLocaleDateString();

          // Check if the CV has a placeholder page directly from the metadata
          const hasPlaceholder = cv.hasPlaceholder === true;
          const placeholderUrl = cv.placeholderUrl ? cv.placeholderUrl : `/api/cv/placeholder/${cv.urlId}`;

          cvCard.innerHTML = `
            <div class="cv-card-header">
              <div class="cv-name">${cv.fileName}</div>
              <div class="cv-date">Uploaded on ${uploadDate}</div>
            </div>
            <div class="cv-card-body">
              <div class="cv-info">
                ${cv.customUrlName ? `<div>Custom URL: /${cv.customUrlName}</div>` : ''}
                <div>Status: ${cv.hasHtml ? 'Generated' : 'Draft'}</div>
                ${cv.hasHtml ? `<div>PDF Landing: ${hasPlaceholder ? 'Available' : 'Generating...'}</div>` : ''}
              </div>
              <div class="cv-actions">
                ${cv.hasHtml
                  ? `<a href="/view-cv/${cv.urlId}" class="cv-btn cv-btn-primary">View</a>`
                  : `<a href="/cv-editor.html?id=${cv.urlId}" class="cv-btn cv-btn-primary">Edit</a>`
                }
                ${cv.hasHtml
                  ? `<a href="${placeholderUrl}" class="cv-btn cv-btn-info" target="_blank">View PDF Landing</a>`
                  : ``
                }
                <a href="/cv-editor.html?id=${cv.urlId}" class="cv-btn cv-btn-secondary">Edit</a>
                <button class="cv-btn cv-btn-danger delete-cv-btn" data-cv-id="${cv.urlId}" data-cv-name="${cv.fileName}">Delete</button>
              </div>
            </div>
          `;

          // Insert before the "Create New CV" button
          cvListEl.insertBefore(cvCard, createCvButton);
        });

        // Set up delete functionality
        setupDeleteButtons();
      }
    } else {
      console.error('Failed to fetch CVs');
      document.getElementById('emptyState').style.display = 'block';
    }
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication first
  fetch('/api/auth/check')
    .then(response => response.json())
    .then(data => {
      if (!data.authenticated) {
        window.location.href = '/login.html';
        return;
      }
      initializeDashboard();
    })
    .catch(error => {
      console.error('Authentication check failed:', error);
      window.location.href = '/login.html';
    });
});