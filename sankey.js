const width = 1000;
const height = 600;

async function createSankey() {
    try {
        // Load and parse data
        const rawData = await d3.csv("Rail_Ridership.csv");
        console.log("Data loaded. First row:", rawData[0]);

        // Process data - use average_flow as the metric
        const data = rawData.map(d => ({
            season: d.season,
            route: d.route_id,
            period: d.time_period_name,
            flow: +d.average_flow  // Convert to number
        }));

        // Get unique values for each category
        const seasons = Array.from(new Set(data.map(d => d.season)));
        const routes = Array.from(new Set(data.map(d => d.route)));
        const periods = Array.from(new Set(data.map(d => d.period)));

        console.log(`Found ${seasons.length} seasons, ${routes.length} routes, ${periods.length} periods`);

        // Create nodes
        const nodes = [
            ...seasons.map(season => ({ id: season, type: "season" })),
            ...routes.map(route => ({ id: route, type: "route" })),
            ...periods.map(period => ({ id: period, type: "period" }))
        ];

        // Create links
        const links = [];

        // Season → Route links
        const seasonRoute = d3.rollup(
            data,
            v => d3.sum(v, d => d.flow),
            d => d.season,
            d => d.route
        );

        seasonRoute.forEach((routes, season) => {
            routes.forEach((value, route) => {
                if (value > 0) {
                    links.push({
                        source: season,
                        target: route,
                        value: value
                    });
                }
            });
        });

        // Route → Period links
        const routePeriod = d3.rollup(
            data,
            v => d3.sum(v, d => d.flow),
            d => d.route,
            d => d.period
        );

        routePeriod.forEach((periods, route) => {
            periods.forEach((value, period) => {
                if (value > 0) {
                    links.push({
                        source: route,
                        target: period,
                        value: value
                    });
                }
            });
        });

        console.log(`Created ${links.length} links between nodes`);

        // Create Sankey layout
        const sankey = d3.sankey()
            .nodeId(d => d.id)
            .nodeWidth(20)
            .nodePadding(25)
            .size([width, height]);

        const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
            nodes: nodes,
            links: links
        });

        // Create SVG
        const svg = d3.select("#vis")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Draw links
        svg.append("g")
            .selectAll(".link")
            .data(sankeyLinks)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", d3.sankeyLinkHorizontal())
            .style("stroke-width", d => Math.max(1, d.width))
            .style("stroke", d => {
                // Color links based on route
                const routeColors = {
                    'Red': '#DA291C',
                    'Orange': '#ED8B00',
                    'Green': '#00843D',
                    'Blue': '#003DA5'
                };
                return routeColors[d.source.id] || '#999';
            })
            .style("opacity", 0.6);

        // Draw nodes
        const node = svg.append("g")
            .selectAll(".node")
            .data(sankeyNodes)
            .enter().append("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        node.append("rect")
            .attr("height", d => d.y1 - d.y0)
            .attr("width", sankey.nodeWidth())
            .attr("fill", d => {
                if (d.type === 'route') {
                    const routeColors = {
                        'Red': '#DA291C',
                        'Orange': '#ED8B00',
                        'Green': '#00843D',
                        'Blue': '#003DA5'
                    };
                    return routeColors[d.id] || '#ccc';
                }
                return d.type === 'season' ? '#888' : '#aaa';
            });

        // Add labels
        node.append("text")
            .attr("x", d => d.x0 < width/2 ? sankey.nodeWidth() + 6 : -6)
            .attr("y", d => (d.y1 - d.y0)/2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width/2 ? "start" : "end")
            .text(d => d.id)
            .call(wrap, 100);

        // Text wrapping function
        function wrap(text, width) {
            text.each(function() {
                const text = d3.select(this);
                const words = text.text().split(/\s+/).reverse();
                let word;
                let line = [];
                let lineNumber = 0;
                const lineHeight = 1.1;
                const y = text.attr("y");
                const dy = parseFloat(text.attr("dy"));
                let tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "px");
                
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "px").text(word);
                    }
                }
            });
        }

    } catch (error) {
        console.error("Error:", error);
        d3.select("#vis").html(`<div style="color:red; padding:20px;">
            <h3>Error loading visualization</h3>
            <p>${error.message}</p>
            <p>Check console for details</p>
        </div>`);
    }
}

createSankey();

