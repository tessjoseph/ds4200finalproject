// Set margins and dimensions
const margin = { top: 40, right: 20, bottom: 40, left: 200 };
const width = 900 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// MBTA Line Colors
const routeColors = {
  'Red': '#FA2D27',
  'Orange': '#FD8A03',
  'Green': '#00843D',
  'Blue': '#003DA5'
};

// Create SVG container
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Create scales
const xScale = d3.scaleLinear().range([0, width]);
const yScale = d3.scaleBand().range([0, height]).padding(0.2);

// Axes groups
const xAxisGroup = svg.append("g")
  .attr("transform", `translate(0,0)`)
  .attr("class", "x-axis");

const yAxisGroup = svg.append("g")
  .attr("class", "y-axis");

// Load data
d3.csv('Rail_Ridership.csv').then(data => {
  // Convert numeric fields
  data.forEach(d => {
    d.average_ons = +d.average_ons;
    d.average_offs = +d.average_offs;
  });

  // Set up unique dropdowns
  const seasons = Array.from(new Set(data.map(d => d.season)));
  const dayTypes = Array.from(new Set(data.map(d => d.day_type_name)));

  // Add dropdowns
  d3.select("#controls")
    .append("select")
    .attr("id", "seasonDropdown")
    .selectAll("option")
    .data(seasons)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  d3.select("#controls")
    .append("select")
    .attr("id", "dayTypeDropdown")
    .selectAll("option")
    .data(dayTypes)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // Initial plot
  updateChart(seasons[0], dayTypes[0]);

  // When dropdown changes
  d3.select("#seasonDropdown").on("change", () => {
    updateChart(d3.select("#seasonDropdown").property("value"), d3.select("#dayTypeDropdown").property("value"));
  });
  d3.select("#dayTypeDropdown").on("change", () => {
    updateChart(d3.select("#seasonDropdown").property("value"), d3.select("#dayTypeDropdown").property("value"));
  });

  function updateChart(selectedSeason, selectedDayType) {
    // Filter data
    const filtered = data.filter(d => d.season === selectedSeason && d.day_type_name === selectedDayType);

    // Aggregate by stop
    const stops = d3.rollups(
      filtered,
      v => ({
        total: d3.sum(v, d => d.average_ons + d.average_offs),
        route_id: v[0].route_id  // Store the route_id with the aggregated data
      }),
      d => d.stop_name
    );

    // Sort and pick top 20
    const topStops = stops.sort((a, b) => b[1].total - a[1].total).slice(0, 20);

    // Update domains
    xScale.domain([0, d3.max(topStops, d => d[1].total)]);
    yScale.domain(topStops.map(d => d[0]));

    // Update axes
    xAxisGroup.transition().duration(750).call(d3.axisTop(xScale).ticks(5));
    yAxisGroup.transition().duration(750).call(d3.axisLeft(yScale));

    // Data join
    const bars = svg.selectAll(".bar")
      .data(topStops, d => d[0]);

    // EXIT
    bars.exit().transition().duration(500).attr("width", 0).remove();

    // UPDATE
    bars.transition().duration(750)
      .attr("y", d => yScale(d[0]))
      .attr("width", d => xScale(d[1].total))
      .attr("height", yScale.bandwidth())
      .attr("fill", d => {
        const route = d[1].route_id;
        return routeColors[route] || '#999';
      });

    // ENTER
    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => yScale(d[0]))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", 0)
      .attr("fill", d => {
        const route = d[1].route_id;
        return routeColors[route] || '#999';
      })
      .transition()
      .duration(750)
      .attr("width", d => xScale(d[1].total));
  }
});
