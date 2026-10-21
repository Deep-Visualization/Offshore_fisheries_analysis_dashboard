// =========================================================
// Offshore Fisheries Analytics Dashboard — web version
// Same filters and charts as offshore_fisheries_dashboard.py,
// reading the NOAA Fisheries records in data/fisheries.csv.
// =========================================================

// Plotly's "Teal" scale, the one the Streamlit version used for the bars and map
const TEAL = ["rgb(209,238,234)", "rgb(168,219,217)", "rgb(133,196,201)", "rgb(104,171,184)",
              "rgb(79,144,166)", "rgb(59,115,143)", "rgb(42,86,116)"];
const LINE = "#0077b6";
const AXIS = "#4A6A7E";
const GRID = "rgba(255,255,255,0.75)";

// Data state names to U.S. state names in the map file
const MAP_NAME = {
    "ALABAMA": "Alabama", "ALASKA": "Alaska", "CALIFORNIA": "California", "CONNECTICUT": "Connecticut",
    "DELAWARE": "Delaware", "FLORIDA-EAST": "Florida", "FLORIDA-WEST": "Florida", "GEORGIA": "Georgia",
    "HAWAII": "Hawaii", "ILLINOIS": "Illinois", "INDIANA": "Indiana", "LOUISIANA": "Louisiana",
    "MAINE": "Maine", "MARYLAND": "Maryland", "MASSACHUSETTS": "Massachusetts", "MICHIGAN": "Michigan",
    "MINNESOTA": "Minnesota", "MISSISSIPPI": "Mississippi", "NEW HAMPSHIRE": "New Hampshire",
    "NEW JERSEY": "New Jersey", "NEW YORK": "New York", "NORTH CAROLINA": "North Carolina", "OHIO": "Ohio",
    "OREGON": "Oregon", "PENNSYLVANIA": "Pennsylvania", "RHODE ISLAND": "Rhode Island",
    "SOUTH CAROLINA": "South Carolina", "TEXAS": "Texas", "VIRGINIA": "Virginia",
    "WASHINGTON": "Washington", "WISCONSIN": "Wisconsin"
};

const fmt = d3.format(",.0f");
const millions = v => d3.format(",.1f")(v / 1e6) + "M";
const money = (v, metric) => (metric === "Dollars" ? "$" : "") + fmt(v);

let D = null;            // landings data
let usStates = null;     // map shapes
let selected = [];       // selected state names
let minYear = 0, maxYear = 0;

const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("display", "none");
function showTip(event, html) {
    tooltip.style("display", "block").html(html);
    const box = tooltip.node().getBoundingClientRect();
    let x = event.pageX + 14;
    if (x + box.width > window.scrollX + document.documentElement.clientWidth - 8) x = event.pageX - box.width - 14;
    tooltip.style("left", x + "px").style("top", (event.pageY - box.height - 12) + "px");
}
const hideTip = () => tooltip.style("display", "none");

// ---------- Controls ----------
const metric = () => document.querySelector('input[name="metric"]:checked').value;
const years = () => {
    const a = +d3.select("#year-from").property("value"), b = +d3.select("#year-to").property("value");
    return [Math.min(a, b), Math.max(a, b)];
};

function setupControls() {
    d3.select("#select-all").on("click", () => { selected = D.states.slice(); update(); });
    d3.select("#clear-all").on("click", () => { selected = []; update(); });
    d3.select("#add-state").on("change", function () {
        if (this.value && !selected.includes(this.value)) {
            selected.push(this.value);
            selected.sort();
        }
        this.value = "";
        update();
    });
    d3.selectAll('input[name="metric"]').on("change", update);

    d3.selectAll("#year-from, #year-to")
        .attr("min", minYear).attr("max", maxYear).attr("step", 1);
    d3.select("#year-from").property("value", minYear);
    d3.select("#year-to").property("value", maxYear);
    d3.selectAll("#year-from, #year-to").on("input", update);
}

function renderSidebar() {
    d3.select("#sel-count").text(selected.length);

    const notSelected = D.states.filter(s => !selected.includes(s));
    d3.select("#add-state").selectAll("option")
        .data([""].concat(notSelected))
        .join("option")
        .attr("value", d => d)
        .text(d => d || (notSelected.length ? "Select a state..." : "All states are selected"));

    const list = d3.select("#state-list").html("");
    if (!selected.length) list.append("li").append("span").attr("class", "empty").text("No states selected");
    selected.forEach(name => {
        const li = list.append("li");
        li.append("span").text("✔ " + name);
        li.append("button").attr("type", "button").attr("aria-label", "Remove " + name).text("x")
            .on("click", () => { selected = selected.filter(s => s !== name); update(); });
    });

    const [a, b] = years();
    d3.select("#out-from").text(a);
    d3.select("#out-to").text(b);
}

// ---------- Filter and summarise ----------
function summarise() {
    const key = metric() === "Pounds" ? "pounds" : "dollars";
    const [a, b] = years();
    const sel = new Set(selected.map(s => D.states.indexOf(s)));
    const byYear = new Map(), byState = new Map(), rows = [];
    let total = 0;
    for (let i = 0; i < D.year.length; i++) {
        const y = D.year[i], s = D.state[i];
        if (y < a || y > b || !sel.has(s)) continue;
        const v = D[key][i];
        total += v;
        byYear.set(y, (byYear.get(y) || 0) + v);
        const name = D.states[s];
        byState.set(name, (byState.get(name) || 0) + v);
        rows.push([y, name, D.pounds[i], D.dollars[i]]);
    }
    const yearly = Array.from(byYear, ([year, value]) => ({ year, value })).sort((p, q) => p.year - q.year);
    const states = Array.from(byState, ([state, value]) => ({ state, value })).sort((p, q) => q.value - p.value);
    return { total, yearly, states, rows };
}

// ---------- Draw everything ----------
function update() {
    renderSidebar();
    const m = metric();
    const s = summarise();

    d3.select("#kpi-total-label").text("Total " + m);
    d3.select("#kpi-total").text(money(s.total, m));
    const maxY = d3.greatest(s.yearly, d => d.value), minY = d3.least(s.yearly, d => d.value);
    d3.select("#kpi-max").text(maxY ? money(maxY.value, m) : "0");
    d3.select("#kpi-max-year").text(maxY ? "in " + maxY.year : "");
    d3.select("#kpi-min").text(minY ? money(minY.value, m) : "0");
    d3.select("#kpi-min-year").text(minY ? "in " + minY.year : "");

    d3.select("#trend-title").text(`${m} Over Time (Millions)`);
    d3.select("#bar-title").text(`Top 10 States by ${m}`);

    const [a, b] = years();
    d3.select("#status").text(selected.length
        ? `Showing ${selected.length} of ${D.states.length} states, ${a}–${b}.`
        : "No states selected. Use \"Select All States\" or add a state to see the charts.");

    drawTrend(s.yearly, m);
    drawBars(s.states.slice(0, 10), m);
    drawMap(s.states, m);
    lastRows = s.rows;
}

function emptyNote(sel, text) {
    d3.select(sel).html("").append("p").attr("class", "note").text(text);
}

function drawTrend(data, m) {
    const sel = "#chart-trend";
    if (!data.length) return emptyNote(sel, "No data for this selection.");
    d3.select(sel).html("");
    const w = Math.max(300, d3.select(sel).node().clientWidth), h = w < 560 ? 280 : 380;
    const mg = { top: 12, right: 18, bottom: 44, left: 60 };
    const svg = d3.select(sel).append("svg").attr("viewBox", `0 0 ${w} ${h}`)
        .attr("role", "img").attr("aria-label", `${m} landed per year, in millions`);
    const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([mg.left, w - mg.right]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value / 1e6)]).nice().range([h - mg.bottom, mg.top]);

    svg.append("g").attr("transform", `translate(${mg.left},0)`)
        .call(d3.axisLeft(y).ticks(6).tickSize(-(w - mg.left - mg.right)).tickFormat(d3.format("~s")))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line").attr("stroke", GRID))
        .call(g => g.selectAll("text").attr("fill", AXIS));
    svg.append("g").attr("transform", `translate(0,${h - mg.bottom})`)
        .call(d3.axisBottom(x).ticks(w < 560 ? 5 : 10).tickFormat(d3.format("d")))
        .call(g => g.selectAll("text").attr("fill", AXIS))
        .call(g => g.selectAll("path,line").attr("stroke", AXIS));
    svg.append("text").attr("x", (mg.left + w - mg.right) / 2).attr("y", h - 6).attr("text-anchor", "middle").attr("fill", AXIS).text("Year");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -(h - mg.bottom + mg.top) / 2).attr("y", 14)
        .attr("text-anchor", "middle").attr("fill", AXIS).text("Millions");

    svg.append("path").datum(data).attr("fill", "none").attr("stroke", LINE).attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.value / 1e6)));
    svg.append("g").selectAll("circle").data(data).join("circle")
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.value / 1e6)).attr("r", data.length > 40 ? 3 : 4).attr("fill", LINE);

    // Hover anywhere along the line for that year's value
    const focus = svg.append("line").attr("stroke", AXIS).attr("stroke-dasharray", "3,3")
        .attr("y1", mg.top).attr("y2", h - mg.bottom).style("display", "none");
    svg.append("rect").attr("x", mg.left).attr("y", mg.top).attr("width", w - mg.left - mg.right).attr("height", h - mg.top - mg.bottom)
        .attr("fill", "transparent")
        .on("mousemove", event => {
            const [px] = d3.pointer(event);
            const yr = Math.round(x.invert(px));
            const d = data.reduce((p, q) => Math.abs(q.year - yr) < Math.abs(p.year - yr) ? q : p);
            focus.style("display", null).attr("x1", x(d.year)).attr("x2", x(d.year));
            showTip(event, `<strong>${d.year}</strong><br>${m}: ${money(d.value, m)}<br>(${millions(d.value)})`);
        })
        .on("mouseleave", () => { focus.style("display", "none"); hideTip(); });
}

function drawBars(data, m) {
    const sel = "#chart-bar";
    if (!data.length) return emptyNote(sel, "No data for this selection.");
    d3.select(sel).html("");
    const w = Math.max(300, d3.select(sel).node().clientWidth), narrow = w < 640;
    const h = narrow ? 340 : 380;
    const mg = { top: 12, right: 80, bottom: narrow ? 112 : 70, left: 60 };
    const svg = d3.select(sel).append("svg").attr("viewBox", `0 0 ${w} ${h}`)
        .attr("role", "img").attr("aria-label", `Top 10 states by ${m}`);
    const x = d3.scaleBand().domain(data.map(d => d.state)).range([mg.left, w - mg.right]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value / 1e6)]).nice().range([h - mg.bottom, mg.top]);
    const color = d3.scaleSequential(d3.interpolateRgbBasis(TEAL)).domain(y.domain());

    svg.append("g").attr("transform", `translate(${mg.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickSize(-(w - mg.left - mg.right)).tickFormat(d3.format("~s")))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line").attr("stroke", GRID))
        .call(g => g.selectAll("text").attr("fill", AXIS));
    svg.append("g").attr("transform", `translate(0,${h - mg.bottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .call(g => g.selectAll("text").attr("fill", AXIS).attr("font-size", 11)
            .attr("text-anchor", narrow ? "end" : "middle")
            .attr("transform", narrow ? "rotate(-40)" : null)
            .attr("dx", narrow ? "-0.4em" : null).attr("dy", narrow ? "0.6em" : "0.9em"))
        .call(g => g.selectAll("path,line").attr("stroke", AXIS));
    svg.append("text").attr("x", (mg.left + w - mg.right) / 2).attr("y", h - 4).attr("text-anchor", "middle").attr("fill", AXIS).text("State");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -(h - mg.bottom + mg.top) / 2).attr("y", 14)
        .attr("text-anchor", "middle").attr("fill", AXIS).text("Millions");

    svg.append("g").selectAll("rect").data(data).join("rect")
        .attr("x", d => x(d.state)).attr("width", x.bandwidth())
        .attr("y", d => y(d.value / 1e6)).attr("height", d => y(0) - y(d.value / 1e6))
        .attr("fill", d => color(d.value / 1e6))
        .on("mousemove", (e, d) => showTip(e, `<strong>${d.state}</strong><br>${m}: ${money(d.value, m)}<br>(${millions(d.value)})`))
        .on("mouseleave", hideTip);

    colorLegend(svg, color, w - mg.right + 24, mg.top, h - mg.top - mg.bottom);
}

function drawMap(stateTotals, m) {
    const sel = "#chart-map";
    if (!usStates) return emptyNote(sel, "The map couldn't load. Check your internet connection and refresh.");
    if (!stateTotals.length) return emptyNote(sel, "No data for this selection.");
    d3.select(sel).html("");

    // Add up by map state (Florida east + west)
    const byName = new Map();
    stateTotals.forEach(d => {
        const n = MAP_NAME[d.state];
        if (n) byName.set(n, (byName.get(n) || 0) + d.value);
    });

    const w = Math.max(300, d3.select(sel).node().clientWidth), h = Math.round(Math.min(w * 0.6, 520));
    const legendW = 80;
    const svg = d3.select(sel).append("svg").attr("viewBox", `0 0 ${w} ${h}`)
        .attr("role", "img").attr("aria-label", `${m} by state on a U.S. map`);
    const projection = d3.geoAlbersUsa().fitSize([w - legendW, h], usStates);
    const path = d3.geoPath(projection);
    const max = d3.max(byName.values()) / 1e6;
    const color = d3.scaleSequential(d3.interpolateRgbBasis(TEAL)).domain([0, max]);

    svg.append("g").selectAll("path").data(usStates.features).join("path")
        .attr("d", path)
        .attr("fill", f => byName.has(f.properties.name) ? color(byName.get(f.properties.name) / 1e6) : "#F4FAFB")
        .attr("stroke", "#FFFFFF").attr("stroke-width", 0.8)
        .on("mousemove", (e, f) => {
            const v = byName.get(f.properties.name);
            showTip(e, `<strong>${f.properties.name}</strong><br>` + (v != null ? `${m}: ${money(v, m)}<br>(${millions(v)})` : "Not in the selection"));
        })
        .on("mouseleave", hideTip);

    colorLegend(svg, color, w - legendW + 24, 20, Math.min(220, h - 60));
}

function colorLegend(svg, color, x, y, height) {
    const id = "grad-" + Math.random().toString(36).slice(2, 8);
    const grad = svg.append("defs").append("linearGradient").attr("id", id).attr("x1", 0).attr("x2", 0).attr("y1", 1).attr("y2", 0);
    TEAL.forEach((c, i) => grad.append("stop").attr("offset", i / (TEAL.length - 1)).attr("stop-color", c));
    const g = svg.append("g").attr("transform", `translate(${x},${y})`);
    g.append("text").attr("y", -2).attr("fill", AXIS).attr("font-size", 12).text("Millions");
    g.append("rect").attr("y", 8).attr("width", 14).attr("height", height - 8).attr("fill", `url(#${id})`);
    const s = d3.scaleLinear().domain(color.domain()).range([height, 8]);
    g.append("g").attr("transform", "translate(14,0)")
        .call(d3.axisRight(s).ticks(4).tickFormat(d3.format("~s")).tickSize(4))
        .call(a => a.select(".domain").remove())
        .call(a => a.selectAll("text").attr("fill", AXIS).attr("font-size", 11))
        .call(a => a.selectAll("line").attr("stroke", AXIS));
}

// ---------- Download ----------
let lastRows = [];
d3.select("#download").on("click", () => {
    const csv = "Year,State,Pounds,Dollars\n" + lastRows.map(r => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "filtered_fisheries_data.csv" });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
});

// ---------- Load ----------
// Read every record in data/fisheries.csv and add up Pounds and Dollars for each year and state.
// Confidential records have no Pounds or Dollars, so they're left out
// (the same rule as offshore_fisheries_dashboard.py).
function buildTotals(rows) {
    const totals = new Map();   // "year|state" -> [pounds, dollars]
    let used = 0;
    rows.forEach(r => {
        const year = +r.Years, state = (r.States || "").trim();
        if (r.Pounds === "" || r.Dollars === "" || !state || !year) return;
        const pounds = +r.Pounds, dollars = +r.Dollars;
        if (isNaN(pounds) || isNaN(dollars)) return;
        used++;
        const key = year + "|" + state;
        const t = totals.get(key) || [0, 0];
        t[0] += pounds;
        t[1] += dollars;
        totals.set(key, t);
    });
    const states = Array.from(new Set(Array.from(totals.keys(), k => k.split("|")[1]))).sort();
    const out = { states, year: [], state: [], pounds: [], dollars: [], records: rows.length, used };
    totals.forEach(([p, d], key) => {
        const [y, s] = key.split("|");
        out.year.push(+y);
        out.state.push(states.indexOf(s));
        out.pounds.push(p);
        out.dollars.push(d);
    });
    return out;
}

Promise.all([
    d3.csv("data/fisheries.csv"),
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json").catch(() => null)
]).then(([rows, us]) => {
    D = buildTotals(rows);
    console.log(`Read ${D.records} records; ${D.used} have pounds and dollars.`);
    if (us) usStates = topojson.feature(us, us.objects.states);
    minYear = d3.min(D.year);
    maxYear = d3.max(D.year);
    selected = D.states.slice();
    setupControls();
    update();
}).catch(err => {
    console.error(err);
    d3.select("#status").text("The landings data couldn't load. Make sure data/fisheries.csv is in the repository, then refresh.");
});

window.addEventListener("resize", debounce(() => { if (D) update(); }, 150));
function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
