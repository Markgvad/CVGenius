// public/js/circlePacking.js

/**
 * Creates a circle packing visualization for CV analytics data
 * @param {Object} data - Hierarchical data for circle packing
 * @param {string} containerId - ID of the container element
 */
function createCirclePacking(data, containerId) {
  // Set dimensions
  const width = 800;
  const height = 800;
  
  // Clear any existing visualization
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  // Create color scale based on section types
  const colorMap = {
    'achievement': '#4BBFC9',  // Work Experience
    'skill': '#4B9ECF',        // Skills
    'education': '#F9A03F',    // Education
    'language': '#9966FF',     // Languages
    'header': '#6EAF46',       // Profile Header
    'other': '#CCC'            // Other sections
  };
  
  // Create the pack layout
  const pack = d3.pack()
      .size([width, height])
      .padding(3);
  
  // Prepare hierarchical data
  const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
  
  // Generate the pack layout
  pack(root);
  
  // Create SVG
  const svg = d3.select("#" + containerId).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .style("font-family", "sans-serif")
      .style("font-size", "10px");
  
  // Add circles with labels
  const node = svg.selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);
  
  // Add circles
  node.append("circle")
      .attr("fill", d => {
          if (!d.children) {
              // Leaf node - use section type color
              return colorMap[d.data.type] || colorMap.other;
          } else {
              // Parent node - white with border
              return "#fff";
          }
      })
      .attr("stroke", d => d.children ? "#bbb" : null)
      .attr("r", d => d.r)
      .on("mouseover", function() { 
          d3.select(this).attr("stroke", "#000").attr("stroke-width", 2); 
      })
      .on("mouseout", function() { 
          d3.select(this).attr("stroke", d => d.children ? "#bbb" : null).attr("stroke-width", 1); 
      });
  
  // Add labels to leaf nodes with enough space
  const leafText = node
      .filter(d => !d.children && d.r > 10)
      .append("text")
      .attr("clip-path", d => `circle(${d.r}px)`);
  
  // Add a tspan for each word
  leafText.selectAll("tspan")
      .data(d => d.data.name.split(/(?=[A-Z][a-z])|\s+/g))
      .join("tspan")
      .attr("x", 0)
      .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.35}em`)
      .text(d => d);
  
  // Add the interaction count
  leafText.append("tspan")
      .attr("x", 0)
      .attr("y", d => `${d.data.name.split(/(?=[A-Z][a-z])|\s+/g).length / 2 + 0.35}em`)
      .attr("fill-opacity", 0.7)
      .text(d => d.value);
  
  // Add tooltips
  node.append("title")
      .text(d => {
          const path = d.ancestors()
              .map(d => d.data.name)
              .reverse()
              .join(" / ");
          return `${path}\n${d.value} interactions`;
      });
}

/**
 * Prepares CV analytics data for circle packing visualization
 * @param {Object} analyticsData - CV analytics data from API
 * @returns {Object} Hierarchical data structure for circle packing
 */
function prepareCirclePackingData(analyticsData) {
  // Define section types and their labels
  const sectionTypes = {
    'achievement': 'Work Experience',
    'skill': 'Skills',
    'education': 'Education',
    'language': 'Languages',
    'header': 'Profile Header',
    'other': 'Other Sections'
  };
  
  // Prepare children array
  const children = [];
  
  // Create section groups
  Object.entries(sectionTypes).forEach(([type, label]) => {
    // Filter interactions for this section type
    const sections = analyticsData.sectionInteractions
      .filter(section => (section.sectionType || 'other') === type);
    
    if (sections.length > 0) {
      // Create children for this section type
      const sectionChildren = sections.map(section => ({
        name: section.sectionTitle || 'Unnamed Section',
        value: section.clicks || 0,
        type: type
      }));
      
      // Add to children array
      children.push({
        name: label,
        children: sectionChildren
      });
    }
  });
  
  // Return the hierarchical structure
  return {
    name: "CV Interactions",
    children: children
  };
}