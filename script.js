// Landing page transition
document.addEventListener('DOMContentLoaded', function() {
  // Handle scroll-based transition from landing page
  const landingSection = document.getElementById('landing');
  const mainContent = document.getElementById('home');
  let transitionInProgress = false;

  // Function to smoothly transition to main content
  function startTransition() {
    if (transitionInProgress) return;
    transitionInProgress = true;
    
    // Show transition animation
    landingSection.classList.add('transform-out');
    
    // After transition completes, hide landing page
    setTimeout(() => {
      landingSection.style.display = 'none';
      document.body.style.overflow = 'auto'; // Enable scrolling
      
      // Remove event listeners as they're no longer needed
      window.removeEventListener('wheel', handleScrollEvent);
      window.removeEventListener('touchmove', handleScrollEvent);
    }, 1000);
  }
  
  // Handle scroll event
  function handleScrollEvent(e) {
    if (!transitionInProgress) {
      // If scrolling down, trigger transition
      if (e.type === 'wheel' && e.deltaY > 0 || e.type === 'touchmove') {
        startTransition();
      }
    }
    
    // Prevent default scrolling while landing page is visible
    if (landingSection.style.display !== 'none') {
      e.preventDefault();
    }
  }
  
  // Add event listeners with passive: false to allow preventDefault()
  window.addEventListener('wheel', handleScrollEvent, { passive: false });
  window.addEventListener('touchmove', handleScrollEvent, { passive: false });
  
  // Also allow clicking anywhere to start transition
  landingSection.addEventListener('click', startTransition);
  
  // Initialize with scroll position at top
  window.scrollTo(0, 0);
  
  // Sticky header effect
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', function() {
    if (window.scrollY > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 70, // Account for fixed header
          behavior: 'smooth'
        });
      }
    });
  });

  // Help button functionality
  const helpButton = document.getElementById('helpButton');
  const featureHelp = document.getElementById('featureHelp');
  
  if (helpButton && featureHelp) {
    // Toggle help tooltip when help button is clicked
    helpButton.addEventListener('click', function(e) {
      e.stopPropagation();
      featureHelp.classList.toggle('hidden');
    });
    
    // Hide help tooltip when clicking anywhere else
    document.addEventListener('click', function() {
      if (!featureHelp.classList.contains('hidden')) {
        featureHelp.classList.add('hidden');
      }
    });
    
    // Prevent clicks within the tooltip from closing it
    featureHelp.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
});

const svg = d3.select("#chart"),
  width = +svg.node().getBoundingClientRect().width,
  height = +svg.attr("height"),
  margin = { top: 30, right: 60, bottom: 60, left: 70 },
  plotWidth = width - margin.left - margin.right,
  plotHeight = height - margin.top - margin.bottom;

// Create a clip path to ensure elements don't render outside the plot area
svg.append("defs").append("clipPath")
  .attr("id", "clip")
  .append("rect")
  .attr("width", plotWidth)
  .attr("height", plotHeight);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

let fullData = [], selectedTechniques = new Set(), currentGender = "All", currentViewMode = "all";
let selectedLineId = null; // null = show all lines
let heartActive = false;
let techniqueHTMLBackup = "";
let cardOriginalHTML = "";
let cardElem = null;
let heartDiv = null;

// Add a flag to track if mouse is over a line
let isHoveringLine = false;

const colorMap = {
  "Chi Meditation": "#1E88E5", // Vivid blue
  "Kundalini Yoga": "#9C27B0", // Rich purple
  "Normal":    "#2ECC71", // Emerald green - might not exist in data 
  "Metronomic Breathing": "#F44336", // Vibrant red
  "Athlete":        "#00BCD4", // Bright cyan
};

// Initialize scales
const x = d3.scaleLinear().range([0, plotWidth]);
const y = d3.scaleLinear().range([plotHeight, 0]);

// Store original scales for zoom reference
let xOriginal = x.copy();
let yOriginal = y.copy();

const line = d3.line()
  .x(d => x(d.time))
  .y(d => y(d.bpm))
  .curve(d3.curveCatmullRom.alpha(0.5));

// Create chart area with clip path for zooming
const chartArea = g.append("g")
  .attr("clip-path", "url(#clip)")
  .attr("class", "chart-area");

const xAxis = g.append("g").attr("transform", `translate(0,${plotHeight})`).attr("class", "x-axis");
const yAxis = g.append("g").attr("class", "y-axis");

// Add X axis label
g.append("text")
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("x", plotWidth / 2)
  .attr("y", plotHeight + 40) // Position below x-axis
  .style("font-size", "14px")
  .style("fill", "#134e4a")
  .text("Time (seconds)");

// Add Y axis label
g.append("text")
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)") // Rotate to vertical
  .attr("x", -plotHeight / 2)
  .attr("y", -50) // Position left of y-axis
  .style("font-size", "14px")
  .style("fill", "#134e4a")
  .text("Heart Rate (BPM)");

// Add a bisector function for finding the closest time point
const bisect = d3.bisector(d => d.time).left;

// Create zoom behavior
const zoom = d3.zoom()
  .scaleExtent([1/2, 8])  // Limit zoom: 0.5x (zoomed out) to 8x (zoomed in)
  .extent([[0, 0], [plotWidth, plotHeight]])
  .on("zoom", zoomed);

// Apply zoom behavior to SVG
svg.call(zoom);

// Add reset zoom button
const resetButton = d3.select("#legend").append("button")
  .attr("class", "ml-auto px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs")
  .text("Reset Zoom")
  .style("display", "none")
  .on("click", resetZoom);

// Function to handle zoom events
function zoomed(event) {
  // Show reset button when zoomed
  resetButton.style("display", "block");
  
  // Get the new transform
  const transform = event.transform;
  
  // Update only the x scale with zoom transform
  const newX = transform.rescaleX(xOriginal);
  
  // Ensure x domain stays within 0-200 range
  let [xMin, xMax] = newX.domain();
  xMin = Math.max(0, xMin);
  xMax = Math.min(200, xMax);
  
  if (xMax - xMin < 5) { // Prevent excessive zoom-in
    return;
  }
  
  // Apply the constrained domain
  newX.domain([xMin, xMax]);
  
  // Update x-axis only
  xAxis.call(d3.axisBottom(newX));
  
  // Update line generator with new x scale but keep original y scale
  const newLine = d3.line()
    .x(d => newX(d.time))
    .y(d => y(d.bpm))
    .curve(d3.curveCatmullRom.alpha(0.5));
  
  // Update all lines with new scales
  g.selectAll(".person-line")
    .attr("d", d => newLine(d[1]));
  
  // Update hover lines
  g.selectAll(".hover-line")
    .attr("d", d => newLine(d[1]));
}

// Function to reset zoom
function resetZoom() {
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);
  
  resetButton.style("display", "none");
}

function renderLegend() {
  const legend = d3.select("#legend");
  legend.selectAll("div.legend-item").remove();

  Object.entries(colorMap).forEach(([tech, color]) => {
    const item = legend.append("div")
      .attr("class", "legend-item flex items-center gap-2");
    item.append("span")
      .style("background-color", color)
      .style("width", "16px")
      .style("height", "16px")
      .style("border-radius", "4px")
      .style("display", "inline-block");
    item.append("span").text(tech);
  });
}

function renderInsights() {
  const insightList = d3.select("#insightList");
  insightList.selectAll("*").remove();

  if (selectedLineId !== null) {
    const singleData = fullData.filter(d => d.person_id === selectedLineId);
    if (singleData.length === 0) return;

    const bpmVals = singleData.map(d => d.bpm);
    const duration = d3.max(singleData, d => d.time) - d3.min(singleData, d => d.time);

    insightList.append("li").html(`<strong>Participant:</strong> ${selectedLineId}`);
    insightList.append("li").html(`<strong>Technique:</strong> ${singleData[0].technique}`);
    insightList.append("li").html(`<strong>Avg BPM:</strong> ${d3.mean(bpmVals).toFixed(1)}`);
    insightList.append("li").html(`<strong>Min BPM:</strong> ${d3.min(bpmVals).toFixed(1)}`);
    insightList.append("li").html(`<strong>Max BPM:</strong> ${d3.max(bpmVals).toFixed(1)}`);
    insightList.append("li").html(`<strong>Duration:</strong> ${duration.toFixed(1)} seconds`);
    return;
  }

  const filtered = fullData.filter(d =>
    (selectedTechniques.size === 0 || selectedTechniques.has(d.technique)) &&
    (currentGender === "All" || d.gender === currentGender)
  );

  if (filtered.length === 0) {
    insightList.append("li").text("No data available for the selected filters.");
    return;
  }

  const groupedByPerson = d3.groups(filtered, d => d.person_id);
  const groupedByTechnique = d3.groups(filtered, d => d.technique);
  const avgByTechnique = groupedByTechnique.map(([tech, values]) => ({
    tech,
    avg: d3.mean(values, d => d.bpm)
  }));

  const max = d3.max(avgByTechnique, d => d.avg);
  const min = d3.min(avgByTechnique, d => d.avg);
  const highest = avgByTechnique.find(d => d.avg === max);
  const lowest = avgByTechnique.find(d => d.avg === min);
  const allBpms = filtered.map(d => d.bpm);
  const range = [d3.min(allBpms), d3.max(allBpms)];

  insightList.append("li").html(`<strong>Number of Participants:</strong> ${groupedByPerson.length}`);
  insightList.append("li").html(`<strong>Heart Rate Range:</strong> ${range[0].toFixed(1)} - ${range[1].toFixed(1)} bpm`);
  insightList.append("li").html(`<strong>Avg Heart Rate (Max):</strong> ${highest.tech} (${highest.avg.toFixed(1)} bpm)`);
  insightList.append("li").html(`<strong>Avg Heart Rate (Min):</strong> ${lowest.tech} (${lowest.avg.toFixed(1)} bpm)`);
}

function updateChart() {
  const filtered = fullData.filter(d =>
    (selectedTechniques.size === 0 || selectedTechniques.has(d.technique)) &&
    (currentGender === "All" || d.gender === currentGender)
  );

  let lineData;
  if (currentViewMode === "all") {
    lineData = d3.groups(filtered, d => d.person_id);
  } else {
    const grouped = d3.groups(filtered, d => d.technique);
    lineData = grouped.map(([tech, records]) => {
      const averaged = d3.groups(records, d => d.time).map(([time, group]) => ({
        technique: tech,
        gender: group[0].gender,
        person_id: `avg-${tech}`,
        time: +time,
        bpm: d3.mean(group, d => d.bpm)
      }));
      return [tech, averaged];
    });
  }

  if (selectedLineId !== null) {
    lineData = lineData.filter(d => d[0] === selectedLineId);
  }

  const allTimes = filtered.map(d => d.time);
  const allBpms = filtered.map(d => d.bpm);
  
  // Update original scales for zooming reference
  xOriginal.domain(d3.extent(allTimes));
  yOriginal.domain([
    Math.max(0, d3.min(allBpms) - 5), // Ensure y-axis doesn't go below 0
    d3.max(allBpms) + 5
  ]);
  
  // Set current scales to match original (resets any zoom)
  x.domain(xOriginal.domain());
  y.domain(yOriginal.domain());

  xAxis.transition().duration(750).call(d3.axisBottom(x));
  yAxis.transition().duration(750).call(d3.axisLeft(y));

  // Update data binding to use chartArea for clipping
  const lines = chartArea.selectAll(".person-line").data(lineData, d => d[0]);

  lines.enter()
    .append("path")
    .attr("class", "person-line")
    .attr("stroke", d => colorMap[d[1][0].technique])
    .attr("stroke-width", currentViewMode === "average" ? 3 : 1.8)
    .attr("fill", "none")
    .attr("opacity", 0)
    .attr("d", d => line(d[1]))
    .transition().duration(750)
    .attr("opacity", 0.7);

  lines.transition().duration(750)
    .attr("stroke", d => colorMap[d[1][0].technique])
    .attr("stroke-width", currentViewMode === "average" ? 3 : 1.8)
    .attr("d", d => line(d[1]));

  lines.exit().transition().duration(500).attr("opacity", 0).remove();

  const hoverLines = chartArea.selectAll(".hover-line").data(lineData, d => d[0]);

  hoverLines.enter()
    .append("path")
    .attr("class", "hover-line")
    .attr("stroke", "transparent")
    .attr("stroke-width", 20)
    .attr("fill", "none")
    .style("cursor", "pointer")
    .attr("d", d => line(d[1]))
    .on("mouseover", function (event, d) {
      isHoveringLine = true;
      
      g.selectAll(".person-line").transition().duration(200).attr("opacity", 0.1);
      g.selectAll(".person-line").filter(ld => ld[0] === d[0])
        .transition().duration(200)
        .attr("stroke-width", 3)
        .attr("opacity", 1);
      
      // Initial tooltip without BPM (will be updated on mousemove)
      let tooltipContent = `<strong>Technique:</strong> ${d[1][0].technique}<br/>`;
      
      // Only show gender for individual lines, not for averages
      if (currentViewMode === "all" && !d[0].startsWith('avg')) {
        tooltipContent += `<strong>Gender:</strong> ${d[1][0].gender}<br/>`;
      }
      
      // Only show Person ID when in individual mode, not in average mode
      if (currentViewMode === "all") {
        tooltipContent += `<strong>Person:</strong> ${d[0]}<br/>`;
      }
      
      tooltip
        .style("display", "block")
        .html(tooltipContent);
    })
    .on("mousemove", function (event, d) {
      // Get mouse x-position relative to the chart
      const mouseX = d3.pointer(event)[0];
      
      // Convert mouse position to time value
      const hoveredTime = x.invert(mouseX);
      
      // Find the closest time point in the data
      const index = bisect(d[1], hoveredTime);
      const a = d[1][index - 1];
      const b = d[1][index];
      
      // Handle edge cases
      if (!a) {
        var closestPoint = b;
      } else if (!b) {
        var closestPoint = a;
      } else {
        var closestPoint = Math.abs(hoveredTime - a.time) < Math.abs(hoveredTime - b.time) ? a : b;
      }
      
      // Update tooltip content with dynamic BPM
      let tooltipContent = `<strong>Technique:</strong> ${d[1][0].technique}<br/>`;
      
      // Only show gender for individual lines, not for averages
      if (currentViewMode === "all" && !d[0].startsWith('avg')) {
        tooltipContent += `<strong>Gender:</strong> ${d[1][0].gender}<br/>`;
      }
      
      // Only show Person ID when in individual mode, not in average mode
      if (currentViewMode === "all") {
        tooltipContent += `<strong>Person:</strong> ${d[0]}<br/>`;
      }
      
      if (closestPoint) {
        tooltipContent += `<strong>Time:</strong> ${closestPoint.time.toFixed(0)}s<br/>`;
        tooltipContent += `<strong>BPM:</strong> ${closestPoint.bpm.toFixed(1)}`;
        updateHeartBeat(closestPoint.bpm);
      }
      
      tooltip
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px")
        .html(tooltipContent);
    })
    .on("mouseout", function () {
      isHoveringLine = false;
      
      // Always hide the tooltip when mouse leaves a line
      tooltip.style("display", "none");
      
      // Only reset line styling if no line is selected
      if (selectedLineId === null) {
        g.selectAll(".person-line")
          .transition().duration(300)
          .attr("stroke-width", d => currentViewMode === "average" ? 3 : 1.8)
          .attr("opacity", 0.7);
      }
    })
    .on("click", function (event, d) {
      selectedLineId = d[0];
      event.stopPropagation(); // prevent SVG background click
      updateChart();
    });

  hoverLines.transition().duration(750).attr("d", d => line(d[1]));
  hoverLines.exit().transition().duration(500).remove();

  // Also add a mouseleave handler to the chart area to ensure tooltip is hidden
  // when cursor moves outside of the chart but the event doesn't trigger mouseout
  chartArea.on("mouseleave", function() {
    if (!isHoveringLine) {
      tooltip.style("display", "none");
    }
  });

  renderInsights();
  
  // Hide reset zoom button when chart data changes
  resetButton.style("display", "none");
}

function populateTechniqueDropdown() {
  const container = d3.select("#techniqueSelect");
  const techniques = [...new Set(fullData.map(d => d.technique))];
  container.selectAll("label").remove();

  techniques.forEach(tech => {
    const label = container.append("label").attr("class", "block text-sm");
    label.append("input")
      .attr("type", "checkbox")
      .attr("value", tech)
      .property("checked", true)
      .on("change", function () {
        if (this.checked) selectedTechniques.add(tech);
        else selectedTechniques.delete(tech);
        updateChart();
      });
    label.append("span").text(" " + tech);
    selectedTechniques.add(tech);
  });
}

function enableHeartMode() {
  if (heartActive) return;
  heartActive = true;

  const container = document.getElementById("techniqueSelect");
  cardElem = container.parentElement; // the outer card div
  cardOriginalHTML = cardElem.innerHTML; // backup content

  // Get computed dimensions of the card
  const cardStyles = getComputedStyle(cardElem);
  const width = cardElem.offsetWidth;
  const height = cardElem.offsetHeight;
  const padding = {
    top: parseFloat(cardStyles.paddingTop),
    bottom: parseFloat(cardStyles.paddingBottom),
    left: parseFloat(cardStyles.paddingLeft),
    right: parseFloat(cardStyles.paddingRight)
  };

  // Clear and style the card
  cardElem.innerHTML = "";
  cardElem.classList.add("flex", "justify-center", "items-center");
  cardElem.style.minWidth = width + "px";
  cardElem.style.minHeight = height + "px";
  cardElem.style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;

  // Add heart icon
  heartDiv = document.createElement("div");
  heartDiv.className = "heart-icon";
  heartDiv.style.setProperty('--beat-speed', `${60 / 60}s`);
  cardElem.appendChild(heartDiv);
}


function disableHeartMode() {
  if (!heartActive) return;
  heartActive = false;
  if (cardElem) {
    cardElem.classList.remove("flex", "justify-center", "items-center");
    cardElem.innerHTML = cardOriginalHTML;
    // Reinitialise technique checkboxes
    populateTechniqueDropdown();
  }
  heartDiv = null;
}

function updateHeartBeat(bpm) {
  if (!heartActive || !heartDiv) return;
  const clampedBpm = Math.max(30, Math.min(160, bpm));
  heartDiv.style.setProperty('--beat-speed', `${60/clampedBpm}s`);
}

// Attach enter/leave listeners to whole svg background not lines
svg.on("mouseenter", enableHeartMode).on("mouseleave", disableHeartMode);

(async function () {
  fullData = await d3.csv("meditation_data.csv", d3.autoType);
  fullData.forEach(d => d.gender = d.gender.toUpperCase());

  populateTechniqueDropdown();
  updateChart();
  renderLegend();

  d3.select("#genderSelect").on("change", function () {
    currentGender = this.value;
    selectedLineId = null;
    updateChart();
  });

  d3.selectAll('input[name="viewMode"]').on("change", function () {
    currentViewMode = this.value;
    selectedLineId = null;
    updateChart();
  });

  svg.on("click", function (event) {
    if (!event.target.closest(".hover-line") && selectedLineId !== null) {
      selectedLineId = null;
      updateChart();
    }
  });
})();
