// Main JavaScript for meditation heart rate visualization
// Handles data loading, chart creation, and figure animations

// Global variables
let fullData = [];
let timeData = []; 
let selectedTechniques = new Set();
let currentGender = "All";
let currentViewMode = "all";
let selectedLineId = null;
let currentTimeIndex = 0;
let isPlaying = false;
let animationTimer = null;
let animationSpeed = 500; // milliseconds between frames
let figureData = {};

// Color mapping for techniques
const colorMap = {
  Chi: "#3b82f6",
  Kundalini: "#8b5cf6", 
  Spontaneous: "#10b981",
  Metronomic: "#ef4444",
  Athlete: "#f59e0b"
};

// Set up initial SVG dimensions for charts
const setupChartDimensions = () => {
  const svg = d3.select("#chart");
  const width = +svg.node().getBoundingClientRect().width;
  const height = +svg.attr("height");
  const margin = { top: 30, right: 60, bottom: 40, left: 60 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  return { svg, width, height, margin, plotWidth, plotHeight };
};

// Initialize line chart
const initLineChart = () => {
  const { svg, margin, plotWidth, plotHeight } = setupChartDimensions();
  
  // Create group for the chart
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .attr("class", "line-chart-group");
  
  // Create tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");
  
  // Create scales
  const x = d3.scaleLinear().range([0, plotWidth]);
  const y = d3.scaleLinear().range([plotHeight, 0]);
  
  // Create line generator
  const line = d3.line()
    .x(d => x(d.time))
    .y(d => y(d.bpm))
    .curve(d3.curveCatmullRom.alpha(0.5));
  
  // Add axes groups
  const xAxis = g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .attr("class", "x-axis");
  const yAxis = g.append("g")
    .attr("class", "y-axis");
  
  // Add axis labels
  g.append("text")
    .attr("class", "x-axis-label")
    .attr("text-anchor", "middle")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + margin.bottom - 5)
    .text("Time (seconds)");
  
  g.append("text")
    .attr("class", "y-axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -margin.left + 15)
    .text("Heart Rate (BPM)");
  
  return { g, tooltip, x, y, line, xAxis, yAxis };
};

// Line chart variables
const lineChart = initLineChart();

// Initialize human figures visualization
const initFiguresVisualization = () => {
  const figuresContainer = d3.select("#figures-container");
  
  // Create a group for each technique
  Object.keys(colorMap).forEach(technique => {
    const figureGroup = figuresContainer.append("div")
      .attr("class", "figure-group")
      .attr("data-technique", technique);
    
    // Add figure title
    figureGroup.append("h3")
      .text(technique)
      .style("color", colorMap[technique]);
    
    // Add SVG container for figure
    const svg = figureGroup.append("svg")
      .attr("class", "figure-svg")
      .attr("width", 150)
      .attr("height", 240);
    
    // Create figure based on technique
    createFigure(svg, technique);
    
    // Add heart that will animate
    const heart = svg.append("g")
      .attr("class", "heart")
      .attr("transform", "translate(75, 80)");
    
    // Heart shape (created with paths)
    heart.append("path")
      .attr("d", "M0,-15 C30,-30 40,0 0,15 C-40,0 -30,-30 0,-15")
      .attr("fill", colorMap[technique])
      .attr("class", "heart-path");
    
    // Add BPM text
    figureGroup.append("div")
      .attr("class", "bpm-display")
      .html(`<span class="bpm-value">--</span> <span class="bpm-unit">BPM</span>`);
  });
};

// Create a figure based on meditation technique
const createFigure = (svg, technique) => {
  // Basic human figure structure
  const figure = svg.append("g")
    .attr("class", "human-figure")
    .attr("transform", "translate(75, 140)");
  
  // Common elements - head
  figure.append("circle")
    .attr("cx", 0)
    .attr("cy", -50)
    .attr("r", 15)
    .attr("fill", "none")
    .attr("stroke", colorMap[technique])
    .attr("stroke-width", 2);
  
  // Technique-specific poses
  switch(technique) {
    case "Chi":
      // Chi pose - standing with hands extended
      figure.append("line") // body
        .attr("x1", 0).attr("y1", -35)
        .attr("x2", 0).attr("y2", 30)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left arm - extended
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", -30).attr("y2", -5)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right arm - extended
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", 30).attr("y2", -5)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left leg
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", -15).attr("y2", 80)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right leg
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", 15).attr("y2", 80)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      break;
      
    case "Kundalini":
      // Kundalini pose - seated with hands in prayer
      figure.append("line") // body
        .attr("x1", 0).attr("y1", -35)
        .attr("x2", 0).attr("y2", 10)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("path") // crossed legs
        .attr("d", "M0,10 C-20,20 -20,40 -10,50 M0,10 C20,20 20,40 10,50")
        .attr("stroke", colorMap[technique])
        .attr("fill", "none")
        .attr("stroke-width", 2);
      
      figure.append("path") // prayer hands
        .attr("d", "M-5,-20 C-10,-10 -5,0 0,5 C5,0 10,-10 5,-20")
        .attr("stroke", colorMap[technique])
        .attr("fill", "none")
        .attr("stroke-width", 2);
      break;
      
    case "Spontaneous":
      // Spontaneous pose - dynamic flowing pose
      figure.append("path") // curved body
        .attr("d", "M0,-35 S5,0 0,30")
        .attr("stroke", colorMap[technique])
        .attr("fill", "none")
        .attr("stroke-width", 2);
      
      figure.append("path") // flowing arms
        .attr("d", "M0,-20 S-20,-30 -30,-10 M0,-20 S20,-5 30,-25")
        .attr("stroke", colorMap[technique])
        .attr("fill", "none")
        .attr("stroke-width", 2);
      
      figure.append("line") // left leg
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", -20).attr("y2", 75)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right leg
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", 10).attr("y2", 80)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      break;
      
    case "Metronomic":
      // Metronomic pose - balanced, measured pose
      figure.append("line") // body
        .attr("x1", 0).attr("y1", -35)
        .attr("x2", 0).attr("y2", 30)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left arm - angled precisely
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", -25).attr("y2", -25)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right arm - angled precisely
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", 25).attr("y2", -25)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left leg - precisely placed
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", -20).attr("y2", 80)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right leg - precisely placed
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", 20).attr("y2", 80)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      break;
      
    case "Athlete":
      // Athlete pose - active pose
      figure.append("line") // body - slightly angled
        .attr("x1", 0).attr("y1", -35)
        .attr("x2", 5).attr("y2", 30)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left arm - active
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", -15).attr("y2", -35)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right arm - active
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", 25).attr("y2", -15)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left leg - lunging
        .attr("x1", 5).attr("y1", 30)
        .attr("x2", -15).attr("y2", 70)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right leg - lunging
        .attr("x1", 5).attr("y1", 30)
        .attr("x2", 25).attr("y2", 65)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      break;
      
    default:
      // Default human figure
      figure.append("line") // body
        .attr("x1", 0).attr("y1", -35)
        .attr("x2", 0).attr("y2", 30)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left arm
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", -20).attr("y2", 0)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right arm
        .attr("x1", 0).attr("y1", -20)
        .attr("x2", 20).attr("y2", 0)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // left leg
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", -15).attr("y2", 80)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
      
      figure.append("line") // right leg
        .attr("x1", 0).attr("y1", 30)
        .attr("x2", 15).attr("y2", 80)
        .attr("stroke", colorMap[technique]).attr("stroke-width", 2);
  }
};

// Animate the heart based on BPM
const animateHeart = (technique, bpm) => {
  if (!bpm) return;
  
  const beatDuration = 60000 / bpm; // milliseconds for one beat
  const heart = d3.select(`.figure-group[data-technique="${technique}"] .heart-path`);
  
  // Update the animation duration based on heart rate
  heart.style("animation-duration", `${beatDuration}ms`);
  
  // Update BPM display
  d3.select(`.figure-group[data-technique="${technique}"] .bpm-value`)
    .text(Math.round(bpm));
};

// Update all heart animations based on current time
const updateHeartAnimations = (timeIndex) => {
  Object.keys(figureData).forEach(technique => {
    if (selectedTechniques.size === 0 || selectedTechniques.has(technique)) {
      let relevantData = figureData[technique];
      
      if (currentGender !== "All") {
        relevantData = relevantData.filter(d => d.gender === currentGender);
      }
      
      // If we have data for this timeIndex
      if (relevantData.length > 0 && timeIndex < relevantData[0].bpmByTime.length) {
        const timePoint = relevantData[0].bpmByTime[timeIndex];
        if (timePoint) {
          animateHeart(technique, timePoint.avgBpm);
        }
      }
    }
  });
};

// Initialize time slider
const initTimeSlider = () => {
  const slider = document.getElementById('time-slider');
  const timeDisplay = document.querySelector('.current-time');
  
  // Set up time slider events
  slider.addEventListener('input', function() {
    currentTimeIndex = parseInt(this.value);
    const currentTime = timeData[currentTimeIndex];
    timeDisplay.textContent = currentTime + 's';
    updateHeartAnimations(currentTimeIndex);
    updateTimeIndicator(currentTimeIndex);
  });
  
  // Play/pause button
  document.getElementById('play-pause').addEventListener('click', function() {
    if (isPlaying) {
      pauseAnimation();
      this.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      startAnimation();
      this.innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
  });
  
  // Reset button
  document.getElementById('reset').addEventListener('click', function() {
    pauseAnimation();
    currentTimeIndex = 0;
    slider.value = 0;
    timeDisplay.textContent = timeData[0] + 's';
    updateHeartAnimations(0);
    updateTimeIndicator(0);
    document.getElementById('play-pause').innerHTML = '<i class="fas fa-play"></i>';
    isPlaying = false;
  });
  
  // Speed control
  document.getElementById('speed-control').addEventListener('change', function() {
    animationSpeed = 1000 / this.value;
    if (isPlaying) {
      pauseAnimation();
      startAnimation();
    }
  });
};

// Start the animation
const startAnimation = () => {
  pauseAnimation(); // Clear any existing animation
  
  animationTimer = setInterval(() => {
    currentTimeIndex++;
    if (currentTimeIndex >= timeData.length) {
      currentTimeIndex = 0;
    }
    
    document.getElementById('time-slider').value = currentTimeIndex;
    document.querySelector('.current-time').textContent = timeData[currentTimeIndex] + 's';
    updateHeartAnimations(currentTimeIndex);
    updateTimeIndicator(currentTimeIndex);
  }, animationSpeed);
};

// Pause the animation
const pauseAnimation = () => {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
};

// Update the line chart
const updateChart = () => {
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
  
  // Update domains
  lineChart.x.domain(d3.extent(allTimes));
  lineChart.y.domain([d3.min(allBpms) - 5, d3.max(allBpms) + 5]);

  // Update axes
  lineChart.xAxis.transition().duration(750)
    .call(d3.axisBottom(lineChart.x));
  lineChart.yAxis.transition().duration(750)
    .call(d3.axisLeft(lineChart.y));

  // Update lines
  const lines = lineChart.g.selectAll(".person-line")
    .data(lineData, d => d[0]);

  lines.enter()
    .append("path")
    .attr("class", "person-line")
    .attr("stroke", d => colorMap[d[1][0].technique])
    .attr("stroke-width", currentViewMode === "average" ? 3 : 1.8)
    .attr("fill", "none")
    .attr("opacity", 0)
    .attr("d", d => lineChart.line(d[1]))
    .transition().duration(750)
    .attr("opacity", 0.7);

  lines.transition().duration(750)
    .attr("stroke", d => colorMap[d[1][0].technique])
    .attr("stroke-width", currentViewMode === "average" ? 3 : 1.8)
    .attr("d", d => lineChart.line(d[1]));

  lines.exit().transition().duration(500)
    .attr("opacity", 0).remove();

  // Update hover lines
  const hoverLines = lineChart.g.selectAll(".hover-line")
    .data(lineData, d => d[0]);

  hoverLines.enter()
    .append("path")
    .attr("class", "hover-line")
    .attr("stroke", "transparent")
    .attr("stroke-width", 20)
    .attr("fill", "none")
    .style("cursor", "pointer")
    .attr("d", d => lineChart.line(d[1]))
    .on("mouseover", function(event, d) {
      if (selectedLineId !== null) return;

      lineChart.g.selectAll(".person-line")
        .transition().duration(200)
        .attr("opacity", 0.1);
      
      lineChart.g.selectAll(".person-line")
        .filter(ld => ld[0] === d[0])
        .transition().duration(200)
        .attr("stroke-width", 3)
        .attr("opacity", 1);

      lineChart.tooltip
        .style("display", "block")
        .html(`<strong>Technique:</strong> ${d[1][0].technique}<br/>
               <strong>Gender:</strong> ${d[1][0].gender}<br/>
               <strong>${d[0].startsWith('avg') ? 'Average Line' : 'Person'}:</strong> ${d[0]}`);
    })
    .on("mousemove", function(event) {
      lineChart.tooltip
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      if (selectedLineId !== null) return;
      
      lineChart.g.selectAll(".person-line")
        .transition().duration(300)
        .attr("stroke-width", d => currentViewMode === "average" ? 3 : 1.8)
        .attr("opacity", 0.7);
      
      lineChart.tooltip.style("display", "none");
    })
    .on("click", function(event, d) {
      selectedLineId = d[0];
      event.stopPropagation();
      updateChart();
    });

  hoverLines.transition().duration(750)
    .attr("d", d => lineChart.line(d[1]));
  
  hoverLines.exit().transition().duration(500).remove();

  // Add time indicator line if needed
  updateTimeIndicator(currentTimeIndex);
  
  // Update insights
  renderInsights();
};

// Update the time indicator on the chart
const updateTimeIndicator = (timeIndex) => {
  if (timeData.length === 0) return;
  
  const time = timeData[timeIndex];
  const indicator = lineChart.g.selectAll(".time-indicator")
    .data([time]);
  
  indicator.enter()
    .append("line")
    .attr("class", "time-indicator")
    .attr("y1", 0)
    .attr("y2", lineChart.plotHeight)
    .attr("stroke", "#ff4d4f")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5")
    .merge(indicator)
    .attr("x1", lineChart.x(time))
    .attr("x2", lineChart.x(time));
  
  indicator.exit().remove();
};

// Populate the technique selection dropdown
const populateTechniqueDropdown = () => {
  const container = d3.select("#techniqueSelect");
  const techniques = [...new Set(fullData.map(d => d.technique))];
  
  container.selectAll("label").remove();

  techniques.forEach(tech => {
    const label = container.append("label")
      .attr("class", "block text-sm");
    
    label.append("input")
      .attr("type", "checkbox")
      .attr("value", tech)
      .property("checked", true)
      .on("change", function() {
        if (this.checked) selectedTechniques.add(tech);
        else selectedTechniques.delete(tech);
        updateChart();
        updateHeartAnimations(currentTimeIndex);
        
        // Toggle visibility of figure group
        d3.select(`.figure-group[data-technique="${tech}"]`)
          .style("display", this.checked ? "block" : "none");
      });
    
    label.append("span").text(" " + tech);
    selectedTechniques.add(tech);
  });
};

// Render data insights
const renderInsights = () => {
  const insightList = d3.select("#insightList");
  insightList.selectAll("*").remove();

  if (selectedLineId !== null) {
    const singleData = fullData.filter(d => d.person_id === selectedLineId);
    if (singleData.length === 0) return;

    const bpmVals = singleData.map(d => d.bpm);
    const duration = d3.max(singleData, d => d.time) - d3.min(singleData, d => d.time);

    insightList.append("li").text(`Participant: ${selectedLineId}`);
    insightList.append("li").text(`Technique: ${singleData[0].technique}`);
    insightList.append("li").text(`Avg BPM: ${d3.mean(bpmVals).toFixed(1)}`);
    insightList.append("li").text(`Min BPM: ${d3.min(bpmVals).toFixed(1)}`);
    insightList.append("li").text(`Max BPM: ${d3.max(bpmVals).toFixed(1)}`);
    insightList.append("li").text(`Duration: ${duration.toFixed(1)} seconds`);
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

  insightList.append("li").text(`Number of participants: ${groupedByPerson.length}`);
  insightList.append("li").text(`Heart rate range: ${range[0].toFixed(1)} - ${range[1].toFixed(1)} bpm`);
  insightList.append("li").text(`Technique with highest average heart rate: ${highest.tech} (${highest.avg.toFixed(1)} bpm)`);
  insightList.append("li").text(`Technique with lowest average heart rate: ${lowest.tech} (${lowest.avg.toFixed(1)} bpm)`);
};

// Process data for figures visualization
const processFigureData = () => {
  // Group data by technique
  const groupedByTechnique = d3.groups(fullData, d => d.technique);
  
  groupedByTechnique.forEach(([technique, records]) => {
    // Group by gender
    const groupedByGender = d3.groups(records, d => d.gender);
    
    figureData[technique] = groupedByGender.map(([gender, genderRecords]) => {
      // Group by time to get averages
      const bpmByTime = d3.groups(genderRecords, d => d.time)
        .map(([time, timeRecords]) => ({
          time: +time,
          avgBpm: d3.mean(timeRecords, d => d.bpm)
        }))
        .sort((a, b) => a.time - b.time);
      
      return {
        technique,
        gender,
        bpmByTime
      };
    });
  });
};

// Setup smooth scrolling
const setupSmoothScrolling = () => {
  document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
};

// Navigation highlighting based on scroll position
const setupScrollSpy = () => {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav a');
  
  window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= sectionTop - 150) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').slice(1) === current) {
        link.classList.add('active');
      }
    });
  });
};

// Setup events for filters and controls
const setupEvents = () => {
  // Gender filter
  d3.select("#genderSelect").on("change", function() {
    currentGender = this.value;
    selectedLineId = null;
    updateChart();
    updateHeartAnimations(currentTimeIndex);
  });
  
  // View mode toggle
  d3.selectAll('input[name="viewMode"]').on("change", function() {
    currentViewMode = this.value;
    selectedLineId = null;
    updateChart();
  });
  
  // Reset selection on background click
  d3.select("#chart").on("click", function(event) {
    if (!event.target.closest(".hover-line") && selectedLineId !== null) {
      selectedLineId = null;
      updateChart();
    }
  });
};

// Initialize scroll animations
const initScrollAnimations = () => {
  // Animate sections on scroll
  const animatedElements = document.querySelectorAll('.fade-in-section');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.1 });
  
  animatedElements.forEach(el => {
    observer.observe(el);
  });
  
  // Scroll down indicator animation
  const scrollIndicator = document.querySelector('.scroll-down-indicator');
  if (scrollIndicator) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        scrollIndicator.classList.add('hidden');
      } else {
        scrollIndicator.classList.remove('hidden');
      }
    });
  }
};

// Load and process the data
const loadData = () => {
  // Instead of directly fetching the CSV, we'll create it from the provided JSON data
  // For an actual implementation, you would use d3.csv("meditation_data.csv", d3.autoType) here
  
  // Function to process the data after loading
  const processData = (data) => {
    fullData = data;
    
    // Extract unique time points and sort them
    timeData = [...new Set(fullData.map(d => d.time))].sort((a, b) => a - b);
    
    // Set up time slider
    const slider = document.getElementById('time-slider');
    slider.max = timeData.length - 1;
    slider.value = 0;
    
    document.querySelector('.start-time').textContent = timeData[0] + 's';
    document.querySelector('.end-time').textContent = timeData[timeData.length - 1] + 's';
    document.querySelector('.current-time').textContent = timeData[0] + 's';
    
    // Process data for figures
    processFigureData();
    
    // Populate technique selection
    populateTechniqueDropdown();
    
    // Update the chart
    updateChart();
    
    // Set initial heart animations
    updateHeartAnimations(0);
    
    // Render the legend
    renderLegend();
  };
  
  // Use D3 to load CSV data
  d3.csv("https://page1.genspark.site/get_upload_url/5d18a9b52d68ac3ef234c6b259c7402f4f3fe18a57cdb33899dbf0b625b1deab/default/202608ba-ced0-47dd-95d2-be224b8d65b4")
    .then(data => {
      // Convert string values to appropriate types
      data.forEach(d => {
        d.time = +d.time;
        d.bpm = +d.bpm;
        d.age = +d.age;
        d.gender = d.gender.toUpperCase();
      });
      processData(data);
    })
    .catch(error => {
      console.error("Error loading data:", error);
      // Fallback to sample data if CSV loading fails
      let sampleData = [];
      for (let i = 0; i < 200; i++) {
        const techniques = ["Chi", "Kundalini", "Spontaneous", "Metronomic", "Athlete"];
        const technique = techniques[Math.floor(Math.random() * techniques.length)];
        const gender = Math.random() > 0.5 ? "M" : "F";
        const personId = `P${Math.floor(Math.random() * 10) + 1}`;
        
        sampleData.push({
          person_id: personId,
          technique: technique,
          gender: gender,
          age: Math.floor(Math.random() * 40) + 20,
          time: i % 20,
          bpm: Math.random() * 30 + 50
        });
      }
      processData(sampleData);
    });
};

// Render color legend
const renderLegend = () => {
  const legend = d3.select("#legend");
  legend.selectAll("div").remove();

  Object.entries(colorMap).forEach(([tech, color]) => {
    const item = legend.append("div").attr("class", "flex items-center gap-2");
    item.append("span")
      .style("background-color", color)
      .style("width", "16px")
      .style("height", "16px")
      .style("border-radius", "4px")
      .style("display", "inline-block");
    item.append("span").text(tech);
  });
};

// Initialize everything when the window loads
window.addEventListener('load', () => {
  // Setup UI elements
  setupSmoothScrolling();
  setupScrollSpy();
  initScrollAnimations();
  
  // Initialize visualizations
  initFiguresVisualization();
  initTimeSlider();
  
  // Setup events
  setupEvents();
  
  // Load data
  loadData();
  
  // Handle responsive behavior
  window.addEventListener('resize', () => {
    // Redraw chart on window resize
    updateChart();
  });
});
