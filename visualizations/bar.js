// Set margins and dimensions
const margin = { top: 40, right: 20, bottom: 40, left: 200 };
const width = 1000 - margin.left - margin.right;
const height = 700 - margin.top - margin.bottom;

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
  .attr("width", "100%")
  .attr("height", height + margin.top + margin.bottom)
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
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

  function updateChart() {
    const selectedSeason = d3.select("#seasonSelect").property("value");
    const selectedDayType = d3.select("#dayTypeSelect").property("value");

    // Filter data
    const filtered = data.filter(d => 
      d.season === selectedSeason && 
      d.day_type_name === selectedDayType
    );

    // Aggregate by stop
    const stops = d3.rollups(
      filtered,
      v => ({
        total: d3.sum(v, d => d.average_ons + d.average_offs),
        route_id: v[0].route_id
      }),
      d => d.stop_name
    );

    // Sort and get top 20
    const topStops = stops
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20);

    // Update scales
    xScale.domain([0, d3.max(topStops, d => d[1].total)]);
    yScale.domain(topStops.map(d => d[0]));

    // Update axes
    xAxisGroup.transition().duration(750).call(d3.axisTop(xScale).ticks(5));
    yAxisGroup.transition().duration(750).call(d3.axisLeft(yScale));

    // Update bars
    const bars = svg.selectAll(".bar")
      .data(topStops, d => d[0]);

    // Exit
    bars.exit()
      .transition()
      .duration(750)
      .attr("width", 0)
      .remove();

    // Enter
    const barsEnter = bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => yScale(d[0]))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", 0);

    // Update + Enter
    bars.merge(barsEnter)
      .transition()
      .duration(750)
      .attr("y", d => yScale(d[0]))
      .attr("width", d => xScale(d[1].total))
      .attr("height", yScale.bandwidth())
      .attr("fill", d => routeColors[d[1].route_id] || "#999");
  }

  // Add event listeners to dropdowns
  d3.select("#seasonSelect").on("change", updateChart);
  d3.select("#dayTypeSelect").on("change", updateChart);

  // Initial chart render
  updateChart();

}).catch(error => {
  console.error("Error loading the data:", error);
});
