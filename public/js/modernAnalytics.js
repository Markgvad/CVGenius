// modernAnalytics.js
// Modern analytics visualizations for CV dashboard

/**
 * Creates a modern skill radar chart for section interactions
 * @param {string} chartId - Canvas element ID
 * @param {Array} sectionData - Section interaction data
 */
function createRadarChart(chartId, sectionData) {
  try {
    const chartElement = document.getElementById(chartId);
    
    if (!chartElement) {
      console.error(`Chart element with ID '${chartId}' not found`);
      return;
    }
    
    if (!sectionData || !Array.isArray(sectionData) || sectionData.length === 0) {
      console.log(`No valid section data for radar chart. Data: ${JSON.stringify(sectionData)}`);
      chartElement.parentElement.innerHTML = 
        '<div class="empty-state-chart"><i class="fas fa-chart-pie"></i><p>No interaction data available yet</p></div>';
      return;
    }
    
    // Ensure all sections have necessary properties
    const validSections = sectionData.filter(section => {
      return section && typeof section.clicks === 'number';
    });
    
    if (validSections.length === 0) {
      chartElement.parentElement.innerHTML = 
        '<div class="empty-state-chart"><i class="fas fa-chart-pie"></i><p>No valid section data available yet</p></div>';
      return;
    }

  // Prepare data
  const labels = validSections.map(s => s.sectionTitle || 'Unnamed Section');
  const values = validSections.map(s => s.clicks || 0);
  const maxValue = Math.max(...values) || 10;

  // Chart configuration
  const ctx = document.getElementById(chartId).getContext('2d');
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Section Interactions',
        data: values,
        backgroundColor: 'rgba(0, 168, 232, 0.2)',
        borderColor: 'rgba(0, 126, 167, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: '#003459',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#003459',
        pointRadius: 4
      }]
    },
    options: {
      scales: {
        r: {
          angleLines: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          pointLabels: {
            font: {
              size: 12
            }
          },
          suggestedMin: 0,
          suggestedMax: maxValue,
          ticks: {
            stepSize: Math.ceil(maxValue / 5),
            backdropColor: 'rgba(255, 255, 255, 0.8)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 52, 89, 0.8)',
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 13
          },
          padding: 12
        }
      },
      animation: {
        duration: 1000
      },
      responsive: true,
      maintainAspectRatio: true
    }
  });
  
  } catch (error) {
    console.error('Error creating radar chart:', error);
    const chartElement = document.getElementById(chartId);
    if (chartElement && chartElement.parentElement) {
      chartElement.parentElement.innerHTML = `
        <div class="empty-state-chart">
          <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
          <p>Error creating radar chart</p>
          <small style="color: #e74c3c;">${error.message}</small>
        </div>`;
    }
  }
}

/**
 * Creates a modern heatmap visualization for section interactions
 * @param {string} containerId - Container element ID
 * @param {Array} sectionData - Section interaction data
 */
function createModernHeatmap(containerId, sectionData) {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID '${containerId}' not found`);
      return;
    }
    
    container.innerHTML = '';
    
    console.log('Creating heatmap with data:', sectionData);
    console.log('Container element found:', container);
    
    if (!sectionData || sectionData.length === 0) {
      console.log('No section data available for heatmap');
      container.innerHTML = '<div class="empty-state-chart"><i class="fas fa-fire"></i><p>No interaction data available yet</p></div>';
      return;
    }
  
  // Group by section type
  const sectionTypes = [
    { type: 'header', name: 'Profile Header', icon: 'fa-id-card' },
    { type: 'achievement', name: 'Work Experience', icon: 'fa-briefcase' },
    { type: 'skill', name: 'Skills', icon: 'fa-code' },
    { type: 'education', name: 'Education', icon: 'fa-graduation-cap' },
    { type: 'language', name: 'Languages', icon: 'fa-language' }
  ];
  
  // Create the heatmap container
  const heatmapWrapper = document.createElement('div');
  heatmapWrapper.className = 'modern-heatmap';
  
  // Create section blocks
  sectionTypes.forEach(section => {
    // Find interactions for this section type
    const filteredSections = sectionData.filter(s => {
      // Add more debugging for section types
      console.log(`Section ${s.sectionTitle}: type=${s.sectionType || 'undefined'}, comparing with ${section.type}`);
      return (s.sectionType || 'other') === section.type;
    });
    
    // Get click count
    const sectionClicks = filteredSections.reduce((sum, s) => sum + s.clicks, 0);
    
    // Always show sections even if no interactions
    // Comment out this line to show all sections
    // if (sectionClicks === 0) return;
    
    // Create section element
    const sectionEl = document.createElement('div');
    sectionEl.className = 'heatmap-section';
    
    // Calculate heat intensity (max intensity at 20+ clicks)
    const intensity = Math.min(sectionClicks / 20, 1);
    const hue = 220 - (intensity * 160); // Blue (220) to Red (60)
    
    sectionEl.style.backgroundImage = `linear-gradient(to right, hsla(${hue}, 80%, 70%, ${0.4 + intensity * 0.6}), hsla(${hue}, 80%, 60%, ${0.4 + intensity * 0.6}))`;
    
    // Create content
    const iconEl = document.createElement('div');
    iconEl.className = 'section-icon';
    iconEl.innerHTML = `<i class="fas ${section.icon}"></i>`;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'section-content';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    titleEl.textContent = section.name;
    
    const statsEl = document.createElement('div');
    statsEl.className = 'section-stats';
    
    // Get section details
    const sectionItems = sectionData.filter(s => (s.sectionType || 'other') === section.type);
    const mostClicked = sectionItems.length > 0 
      ? sectionItems.reduce((max, s) => s.clicks > max.clicks ? s : max, sectionItems[0])
      : null;
    
    statsEl.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${sectionClicks}</div>
        <div class="stat-label">Interactions</div>
      </div>
      ${mostClicked ? `
      <div class="stat-item">
        <div class="stat-value">${mostClicked.sectionTitle}</div>
        <div class="stat-label">Most Clicked</div>
      </div>
      ` : ''}
    `;
    
    contentEl.appendChild(titleEl);
    contentEl.appendChild(statsEl);
    
    sectionEl.appendChild(iconEl);
    sectionEl.appendChild(contentEl);
    
    // Add interactions badge
    const badgeEl = document.createElement('div');
    badgeEl.className = 'interaction-badge';
    badgeEl.textContent = sectionClicks;
    
    sectionEl.appendChild(badgeEl);
    heatmapWrapper.appendChild(sectionEl);
  });
  
  container.appendChild(heatmapWrapper);
  
  // Log the final HTML to make sure it's being properly added
  console.log('Heatmap HTML:', container.innerHTML);
  
  } catch (error) {
    console.error('Error creating heatmap:', error);
    // Display error in the container
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="empty-state-chart">
        <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
        <p>Error creating heatmap visualization</p>
        <small>${error.message}</small>
      </div>`;
    }
  }
}

/**
 * Creates a modern timeline visualization of CV views
 * @param {string} containerId - Container element ID
 * @param {Array} viewData - Array of view dates
 */
function createViewTimeline(containerId, viewData) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (!viewData || viewData.length === 0) {
    container.innerHTML = '<div class="empty-state-chart"><i class="fas fa-calendar"></i><p>No view data available yet</p></div>';
    return;
  }
  
  // Process view data to get counts by date
  const viewsByDate = {};
  
  // Process provided viewData
  const processedDates = viewData.map(view => {
    // Ensure we have a date object
    const date = view.date ? new Date(view.date) : new Date();
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  
  // Count views by date
  processedDates.forEach(date => {
    viewsByDate[date] = (viewsByDate[date] || 0) + 1;
  });
  
  // Create date array sorted chronologically
  const dates = Object.keys(viewsByDate).sort();
  
  // Create timeline container
  const timelineEl = document.createElement('div');
  timelineEl.className = 'view-timeline';
  
  // Get max views for scaling
  const maxViews = Math.max(...Object.values(viewsByDate));
  
  // Create data points
  dates.forEach(date => {
    const views = viewsByDate[date];
    const intensity = views / maxViews;
    
    const dateEl = document.createElement('div');
    dateEl.className = 'timeline-date';
    
    const dotSize = 10 + (intensity * 20); // 10px to 30px based on intensity
    
    const dotEl = document.createElement('div');
    dotEl.className = 'timeline-dot';
    dotEl.style.width = `${dotSize}px`;
    dotEl.style.height = `${dotSize}px`;
    dotEl.style.backgroundColor = `rgba(0, 126, 167, ${0.4 + intensity * 0.6})`;
    
    const labelEl = document.createElement('div');
    labelEl.className = 'timeline-label';
    
    // Format date for display
    const displayDate = new Date(date);
    labelEl.textContent = displayDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    
    const countEl = document.createElement('div');
    countEl.className = 'timeline-count';
    countEl.textContent = views;
    
    dateEl.appendChild(dotEl);
    dateEl.appendChild(labelEl);
    dateEl.appendChild(countEl);
    
    // Add tooltip
    dateEl.title = `${views} views on ${displayDate.toLocaleDateString()}`;
    
    timelineEl.appendChild(dateEl);
  });
  
  container.appendChild(timelineEl);
}

/**
 * Creates a modern engagement scorecard 
 * @param {string} containerId - Container element ID
 * @param {Object} analyticsData - Full analytics data
 */
function createEngagementScore(containerId, analyticsData) {
  const container = document.getElementById(containerId);
  
  if (!analyticsData || !analyticsData.views) {
    container.innerHTML = '<div class="empty-state-chart"><i class="fas fa-star"></i><p>No data available to calculate engagement</p></div>';
    return;
  }
  
  // Calculate engagement score (algorithm can be adjusted)
  const views = analyticsData.views || 0;
  const interactions = (analyticsData.sectionInteractions || []).reduce((sum, s) => sum + s.clicks, 0);
  
  // Base score calculation
  let score = 0;
  
  if (views > 0) {
    // Calculate interaction rate (interactions per view)
    const interactionRate = interactions / views;
    
    // Calculate engagement score (scale 0-100)
    score = Math.min(100, Math.round(
      // Base score for views
      Math.min(40, views * 4) + 
      // Score for interaction rate
      Math.min(60, interactionRate * 60)
    ));
  }
  
  // Determine engagement level
  let level, color, icon;
  
  if (score >= 80) {
    level = 'Excellent';
    color = '#2ecc71'; // Green
    icon = 'fa-trophy';
  } else if (score >= 60) {
    level = 'Good';
    color = '#3498db'; // Blue
    icon = 'fa-thumbs-up';
  } else if (score >= 40) {
    level = 'Average';
    color = '#f39c12'; // Orange
    icon = 'fa-star-half-alt';
  } else if (score > 0) {
    level = 'Low';
    color = '#e74c3c'; // Red
    icon = 'fa-exclamation-circle';
  } else {
    level = 'Not enough data';
    color = '#95a5a6'; // Gray
    icon = 'fa-question-circle';
  }
  
  // Create scorecard HTML
  container.innerHTML = `
    <div class="engagement-scorecard">
      <div class="score-header">
        <div class="score-title">CV Engagement Score</div>
        <div class="score-icon"><i class="fas ${icon}" style="color: ${color}"></i></div>
      </div>
      
      <div class="score-value-container">
        <div class="score-value" style="color: ${color}">${score}</div>
        <div class="score-level">${level}</div>
      </div>
      
      <div class="score-details">
        <div class="score-metric">
          <div class="metric-name">Views</div>
          <div class="metric-value">${views}</div>
        </div>
        <div class="score-metric">
          <div class="metric-name">Interactions</div>
          <div class="metric-value">${interactions}</div>
        </div>
        <div class="score-metric">
          <div class="metric-name">Interactions/View</div>
          <div class="metric-value">${views > 0 ? (interactions / views).toFixed(1) : 0}</div>
        </div>
      </div>
      
      <div class="score-tips">
        ${score < 60 ? `
        <div class="tip-header">Tips to improve engagement:</div>
        <ul class="tip-list">
          <li>Add more detailed achievements to showcase your experience</li>
          <li>Ensure your skills section reflects current industry demands</li>
          <li>Use action verbs and quantify accomplishments where possible</li>
        </ul>
        ` : `
        <div class="tip-header">Your CV is performing well!</div>
        <p class="tip-congrats">Keep your information up to date for continued success.</p>
        `}
      </div>
    </div>
  `;
}