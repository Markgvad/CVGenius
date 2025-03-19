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
      loadUserCVs(); // This function should be defined in the dashboard.html script
    }
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
    
    // Create subscription info section
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
      const subscriptionInfo = document.createElement('div');
      subscriptionInfo.className = 'dashboard-card subscription-info';
      
      let tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
      let expiry = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'N/A';
      
      subscriptionInfo.innerHTML = `
        <div class="card-title">
          <h2>Subscription Details</h2>
          <i class="fas fa-crown"></i>
        </div>
        <div class="subscription-details">
          <p><strong>Plan:</strong> ${tierName}</p>
          <p><strong>Expires:</strong> ${expiry}</p>
          <p><strong>CVs Allowed:</strong> ${data.allowedCVs}</p>
          <p><strong>Analytics:</strong> ${data.hasAnalytics ? 'Detailed' : 'Basic'}</p>
          ${data.tier !== 'premium' ? 
            '<button id="upgrade-btn" class="btn btn-primary">Upgrade Plan</button>' : ''}
        </div>
      `;
      
      // Insert after the welcome section
      welcomeSection.parentNode.insertBefore(subscriptionInfo, welcomeSection.nextSibling);
      
      // Add event listener for upgrade button
      if (data.tier !== 'premium') {
        document.getElementById('upgrade-btn')?.addEventListener('click', () => {
          window.location.href = '/pricing.html';
        });
      }
    }
  } catch (error) {
    console.error('Failed to load subscription status:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSubscriptionStatus();
  setupAnalytics();
});