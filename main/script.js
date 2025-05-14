const svg = d3.select("#chart"),
  width = +svg.node().getBoundingClientRect().width,
  height = +svg.attr("height"),
  margin = { top: 30, right: 60, bottom: 40, left: 60 },
  plotWidth = width - margin.left - margin.right,
  plotHeight = height - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

let fullData = [], selectedTechniques = new Set(), currentGender = "All", currentViewMode = "all";
let selectedLineId = null; // null = show all lines

const colorMap = {
  Chi: "#3b82f6",
  "Kundalini (Yoga)": "#8b5cf6",
  Normal: "#10b981",
  Metronomic: "#ef4444",
  Athlete: "#f59e0b"
};

const x = d3.scaleLinear().range([0, plotWidth]);
const y = d3.scaleLinear().range([plotHeight, 0]);

const line = d3.line()
  .x(d => x(d.time))
  .y(d => y(d.bpm))
  .curve(d3.curveCatmullRom.alpha(0.5));

const xAxis = g.append("g").attr("transform", `translate(0,${plotHeight})`).attr("class", "x-axis");
const yAxis = g.append("g").attr("class", "y-axis");

function renderLegend() {
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
}

function renderInsights() {
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
  x.domain(d3.extent(allTimes));
  y.domain([d3.min(allBpms) - 5, d3.max(allBpms) + 5]);

  xAxis.transition().duration(750).call(d3.axisBottom(x));
  yAxis.transition().duration(750).call(d3.axisLeft(y));

  const lines = g.selectAll(".person-line").data(lineData, d => d[0]);

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

  const hoverLines = g.selectAll(".hover-line").data(lineData, d => d[0]);

  hoverLines.enter()
    .append("path")
    .attr("class", "hover-line")
    .attr("stroke", "transparent")
    .attr("stroke-width", 20)
    .attr("fill", "none")
    .style("cursor", "pointer")
    .attr("d", d => line(d[1]))
    .on("mouseover", function (event, d) {
      if (selectedLineId !== null) return;

      g.selectAll(".person-line").transition().duration(200).attr("opacity", 0.1);
      g.selectAll(".person-line").filter(ld => ld[0] === d[0])
        .transition().duration(200)
        .attr("stroke-width", 3)
        .attr("opacity", 1);

      tooltip
        .style("display", "block")
        .html(`<strong>Technique:</strong> ${d[1][0].technique}<br/>
               <strong>Gender:</strong> ${d[1][0].gender}<br/>
               <strong>${d[0].startsWith('avg') ? 'Average Line' : 'Person'}:</strong> ${d[0]}`);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      if (selectedLineId !== null) return;
      g.selectAll(".person-line")
        .transition().duration(300)
        .attr("stroke-width", d => currentViewMode === "average" ? 3 : 1.8)
        .attr("opacity", 0.7);
      tooltip.style("display", "none");
    })
    .on("click", function (event, d) {
      selectedLineId = d[0];
      event.stopPropagation(); // prevent SVG background click
      updateChart();
    });

  hoverLines.transition().duration(750).attr("d", d => line(d[1]));
  hoverLines.exit().transition().duration(500).remove();

  renderInsights();
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
