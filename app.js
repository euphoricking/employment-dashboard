
let data = [];
let geojsonData = null;
let leafletMap = null;
let geojsonLayer = null;
let charts = {};

Promise.all([
  fetch("data.json").then((res) => res.json()),
  fetch("countries.geojson").then((res) => res.json()),
]).then(([jsonData, geoData]) => {
  data = jsonData;
  geojsonData = geoData;
  populateSelectors();
  updateVisuals();
});

function populateSelectors() {
  const austriaYearSelect = document.getElementById("austria-year");
  const compareYearSelect = document.getElementById("compare-year");
  const compareCountrySelect = document.getElementById("compare-country");

  const years = [...new Set(data.map((d) => d.Year))].sort();
  const countries = ["Germany", "Czechia", "Slovakia", "Hungary", "Slovenia", "Italy", "Switzerland"];

  years.forEach((year) => {
    austriaYearSelect.add(new Option(year, year));
    compareYearSelect.add(new Option(year, year));
  });

  countries.forEach((country) => {
    compareCountrySelect.add(new Option(country, country));
  });

  austriaYearSelect.addEventListener("change", updateVisuals);
  compareYearSelect.addEventListener("change", updateVisuals);
  compareCountrySelect.addEventListener("change", updateVisuals);
}

function updateVisuals() {
  const austriaYear = document.getElementById("austria-year").value;
  const compareYear = document.getElementById("compare-year").value;
  const compareCountry = document.getElementById("compare-country").value;

  const austriaData = data.filter(d => d.Country === "Austria" && d.Year == austriaYear);
  const compareData = data.filter(d => d.Country === compareCountry && d.Year == compareYear);

  renderIndicators(austriaData, "austria");
  renderIndicators(compareData, "compare");
computeDifference(austriaData, compareData);

  drawLineChart("Austria", "austria-line", "#1f77b4");
  drawLineChart(compareCountry, "compare-line", "#ff7f0e");
  drawBarChart(austriaData, compareData);
  renderMap();
}

function renderIndicators(records, panelId) {
  const male = records.find(d => d.Sex === "Male")?.["Employment Rate"] || "-";
  const female = records.find(d => d.Sex === "Female")?.["Employment Rate"] || "-";
  const total = records.find(d => d.Sex === "Total")?.["Employment Rate"] || "-";

  document.getElementById(`${panelId}-male`).textContent = male;
  document.getElementById(`${panelId}-female`).textContent = female;
  document.getElementById(`${panelId}-total`).textContent = total;
}

function drawLineChart(country, chartId, color) {
  const ctx = document.getElementById(chartId);
  const records = data.filter(d => d.Country === country && d.Sex === "Total");
  const labels = records.map(r => r.Year);
  const values = records.map(r => r["Employment Rate"]);

  if (charts[chartId]) charts[chartId].destroy();

  charts[chartId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: country + " Total Employment Rate",
        data: values,
        borderColor: color,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } }
    }
  });
}

function drawBarChart(austriaData, compareData) {
  const ctx = document.getElementById("bar-chart");

  if (charts["bar-chart"]) charts["bar-chart"].destroy();

  const labels = ["Male", "Female", "Total"];
  const austria = labels.map(sex => austriaData.find(d => d.Sex === sex)?.["Employment Rate"] || 0);
  const compare = labels.map(sex => compareData.find(d => d.Sex === sex)?.["Employment Rate"] || 0);

  charts["bar-chart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "Austria", data: austria, backgroundColor: "#1f77b4" },
        { label: "Comparison", data: compare, backgroundColor: "#ff7f0e" }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } }
    }
  });
}


function computeDifference(austriaData, compareData) {
  const getRate = (arr, sex) => arr.find(d => d.Sex === sex)?.["Employment Rate"] || 0;
  ["Male", "Female", "Total"].forEach(sex => {
    const diff = (getRate(compareData, sex) - getRate(austriaData, sex)).toFixed(2);
    const diffId = document.getElementById(`diff-${sex.toLowerCase()}`);
    if (diffId) diffId.textContent = diff;
  });
}


function renderMap() {
  if (!leafletMap) {
    leafletMap = L.map("map").setView([47.5, 13.5], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(leafletMap);
  }

  if (geojsonLayer) geojsonLayer.remove();

  geojsonLayer = L.geoJSON(geojsonData, {
    onEachFeature: (feature, layer) => {
      const name = feature.properties.name;
      const countryData = data.filter(d => d.Country === name);

      
    // const tooltip = `<strong>${name}</strong><br>` +
    //   ["Male", "Female", "Total"].map(sex => {
    //     const yearMap = {};
    //     data.filter(d => d.Country === name && d.Sex === sex).forEach(d => {
    //       yearMap[d.Year] = d["Employment Rate"];
    //     });
    //     return `<em>${sex}</em>:<br>` + Object.entries(yearMap).map(([y,v]) => `${y}: ${v}`).join("<br>");
    //   }).join("<br><br>");

    const years = [...new Set(countryData.map(d => d.Year))].sort();

    const yearRows = years.map(year => {
      const male = countryData.find(d => d.Year === year && d.Sex === "Male")?.["Employment Rate"] || "-";
      const female = countryData.find(d => d.Year === year && d.Sex === "Female")?.["Employment Rate"] || "-";
      const total = countryData.find(d => d.Year === year && d.Sex === "Total")?.["Employment Rate"] || "-";

      return `<tr>
        <td style="padding:2px 6px;">${year}</td>
        <td style="padding:2px 6px;">${male}</td>
        <td style="padding:2px 6px;">${female}</td>
        <td style="padding:2px 6px;">${total}</td>
      </tr>`;
    }).join("");

    const tooltip = `
      <strong>${name}</strong><br>
      <table style="font-size:12px; border-collapse:collapse;">
        <tr>
          <th style="padding:2px 6px;">Year</th>
          <th style="padding:2px 6px;">Male</th>
          <th style="padding:2px 6px;">Female</th>
          <th style="padding:2px 6px;">Total</th>
        </tr>
        ${yearRows}
      </table>
    `;

    
      layer.bindTooltip(tooltip);
    }
  }).addTo(leafletMap);
}
