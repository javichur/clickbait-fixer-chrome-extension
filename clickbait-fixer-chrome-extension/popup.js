let btnScanLinks = document.getElementById("btnScanLinks");
let btnSettings = document.getElementById("btnSettings");
btnSettings.addEventListener('click', openOptionsPage);

let lblStatus = document.getElementById("lblStatus");

var gauge_canvas = document.getElementById('gauge_canvas');
var gauge_value = document.getElementById('gauge-value');

let CURRENT_ENTITIES = null; // for anonymizer
chrome.storage.sync.get("CURRENT_ENTITIES", (data) => {
  CURRENT_ENTITIES = data.CURRENT_ENTITIES;
  console.log('Entities loaded: ' + JSON.stringify(CURRENT_ENTITIES));
});

var optsChart = {
  angle: -0.2, // The span of the gauge arc
  lineWidth: 0.2, // The line thickness
  radiusScale: 1, // Relative radius
  pointer: {
    length: 0.6, // // Relative to gauge radius
    strokeWidth: 0.035, // The thickness
    color: '#000000' // Fill color
  },
  limitMax: false,     // If false, max value increases automatically if value > maxValue
  limitMin: false,     // If true, the min value of the gauge will be fixed
  colorStart: '#6FADCF',   // Colors
  colorStop: '#8FC0DA',    // just experiment with them
  strokeColor: '#E0E0E0',  // to see which ones work best for you
  generateGradient: true,
  highDpiSupport: true,     // High resolution support
  staticZones: [
    { strokeStyle: "#f44336", min: 0, max: 33 },
    { strokeStyle: "#FFDD00", min: 34, max: 66 },
    { strokeStyle: "#4caf50", min: 67, max: 100 },
  ]
};

window.onload = async function () {
  drawScoreChart(0);

  let capabilities = 'no';
  try {
    capabilities = await ai.languageModel.capabilities();
    if (capabilities.available == 'readily') lblStatus.innerHTML = 'AI local model ready :)';
    else if (capabilities.available == 'after-download') lblStatus.innerHTML = 'AI local model not ready. <a href="#" onClick="downloadTheModel();">Click here to download it</a>.';
    else lblStatus.innerHTML = 'AI local model not available in your web browser.';
  } catch (e) {
    lblStatus.innerHTML = 'AI local model not available in your web browser.';
  }
}

async function downloadTheModel() {
  const session = await ai.languageModel.create({
    monitor(m) {
      m.addEventListener("downloadprogress", e => {
        lblStatus.innerHTML = `Downloading local AI (${e.loaded} of ${e.total} bytes).`;
        if (e.loaded == e.total) {
          lblStatus.innerHTML = 'AI local model ready.';
        }
      });
    }
  });
}


function openOptionsPage(event) {
  chrome.runtime.openOptionsPage();
}


function drawScoreChart(value) {
  gauge_canvas.style.display = 'block';
  gauge_value.style.direction = 'block';

  var gauge = new Gauge(gauge_canvas).setOptions(optsChart);

  gauge.setTextField(gauge_value);

  gauge.maxValue = 100; // set max gauge value
  gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
  gauge.animationSpeed = 32; // set animation speed (32 is default value)
  gauge.set(value); // set actual value
}


chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    // sendResponse({ farewell: "sendResponse onMessageonMessage" });
    console.log('onMessageonMessage');

    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");

    if (request.count_links_analyzed) {
      let value = 100 - (request.count_links_clickbait * 100 / (1 + request.count_links_clickbait + request.count_links_not_clickbait));
      drawScoreChart(value);

      if (!request.scan_completed)
        btnScanLinks.innerHTML = `Scanning...<br/>${request.count_links_analyzed} links analyzed.`;
      else
        btnScanLinks.innerHTML = `Scan completed.<br/>${request.count_links_analyzed} links analyzed.`;
      // console.log(request);
    }
  }
);


btnScanLinks.addEventListener("click", async () => {

  btnScanLinks.innerHTML = 'starting...';
  btnScanLinks.disabled = true;

  lblStatus.innerHTML = '';

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: reviewAllLinks,
  });
});


async function reviewAllLinks() {
  chrome.storage.sync.get("MAX_NUM_LINKS", async ({ MAX_NUM_LINKS }) => {
    console.log('start reviewAllLinks()');

    await getCleanLinksFromWeb(MAX_NUM_LINKS);
  });
}