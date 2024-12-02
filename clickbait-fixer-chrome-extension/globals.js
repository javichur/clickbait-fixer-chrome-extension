let MIN_WORDS_IN_LINKS = 4;
let clickbait_prompt = `You are an expert clickbait link detector. Is the following link clickbait?

The link: "{}"

Please respond in this JSON format:
{
"is_clickbait": boolean,
"explanation": string
}

where 'is_clickbait' will be true or false.
and "explanation" is a text of maximum 150 characters explaining why it is clickbait or why it is not.
In the "explanation" string, instead of using double quotes, use the single quotes.`;

let generate_non_clickbait_headline_prompt = `You are an expert writing non-clickbait headlines. Please write a non-clickbait headline for the following web content. 
Reply only with the headline.

The content is: {}`;

let session = null;
let summarizer = null;

let count_links_analyzed = 0;
let count_links_clickbait = 0;
let count_links_not_clickbait = 0;


let tooltip = null;

async function downloadAndSummarize(link) {
  let ret = null;

  $.ajax({
    async: false,
    url: link,
    type: 'GET',
    success: function (result) {
      console.log('OK downloadAndSummarize: ' + JSON.stringify(result));
      ret = result;
    },
    error: function (error) {
      console.log('error downloadAndSummarize: ' + JSON.stringify(error));
    }
  });

  if (ret) {
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = ret;

    let cleanContent = getCleanTextFromWeb(tempDiv);
    console.log('cleanContent: ' + cleanContent);

    let lblSummaryInTooltip = null;
    try {
      //let modelResult = await session.prompt(generate_non_clickbait_headline_prompt.replace('{}', cleanContent));
      if (!summarizer) {
        summarizer = await ai.summarizer.create({ 
          type: "headline", // "tl;dr"
          length: "short",
          format: "plain-text",
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              console.log(`Downloading summarizer model. Downloaded ${e.loaded} of ${e.total} bytes.`);
            });
          } }); 
      }
      let modelResult = await summarizer.summarize(cleanContent);

      console.log('modelResult non-clickbait: ' + modelResult);

      lblSummaryInTooltip = document.getElementById("lblSummaryInTooltip");
      if (lblSummaryInTooltip)
        lblSummaryInTooltip.innerHTML = '🤖 Non-clickbait headline proposed by AI after reading the destination:<br/>' + modelResult;

    } catch (e) {
      console.log('error in summarize API: ' + e);

      lblSummaryInTooltip = document.getElementById("lblSummaryInTooltip");
      if (lblSummaryInTooltip)
        lblSummaryInTooltip.innerHTML = 'Error generating the AI non-clickbait headline.' + JSON.stringify(e);
    }
  }
}


function addTooltip(node, isClickbait, tooltipText) {
  if (!node || !(node instanceof HTMLElement)) {
    console.error("Invalid DOM node provided.");
    return;
  }

  // Create the tooltip element
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = 'myTooltip';
    tooltip.innerHTML = '';
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "#bae1ff";
    tooltip.style.color = "#000";
    tooltip.style.padding = "5px 10px";
    tooltip.style.borderRadius = "5px";
    tooltip.style.fontSize = "12px";
    tooltip.style.fontFamily = "sans-serif";
    tooltip.style.whiteSpace = "normal";
    tooltip.style.pointerEvents = "none";
    tooltip.style.opacity = "0";
    tooltip.style.transition = "opacity 0.2s";
    tooltip.style.zIndex = "10000";
    tooltip.style.width = "500px";

    document.body.appendChild(tooltip);
  }


  // Add event listeners to show and position the tooltip
  node.addEventListener("mouseenter", (event) => {
    tooltip.innerHTML = '<h2>Clickbait Fixer.</h2>' + tooltipText;
    if (isClickbait === true)
      tooltip.innerHTML += '<br/><br/><span id="lblSummaryInTooltip">⏳ Downloading destination to generate a non-clickbait headline.</span>';
    tooltip.style.opacity = "1";
    tooltip.style.top = `${event.pageY + 10}px`;
    tooltip.style.left = `${event.pageX + 10}px`;

    downloadAndSummarize(node.href);
  });

  node.addEventListener("mousemove", (event) => {
    tooltip.style.top = `${event.pageY + 10}px`;
    tooltip.style.left = `${event.pageX + 10}px`;
  });

  node.addEventListener("mouseleave", () => {
    tooltip.style.opacity = "0";
  });
}


function replaceLastSingleQuote(input) {
  const lastIndex = input.lastIndexOf("'"); // Find the last occurrence of '
  
  if (lastIndex === -1) return input; // If no single quote is found, return the original string
  
  // Replace the last occurrence of ' with "
  return input.substring(0, lastIndex) + '"' + input.substring(lastIndex + 1);
}

function sanitizeModelResult(result) {
  if (!result.trim().endsWith('}')) {
    result += '}';
  }

  result = result.replace(/"/g, "'");
  result = result.replace('\'is_clickbait\'', '"is_clickbait"');
  result = result.replace('\'explanation\': \'', '"explanation": "');
  result = result.replace(/\\/g, "");

  result = replaceLastSingleQuote(result);

  return result;
}


function highlightLinkAndAddTooltip(anchorElement, isClickbait, explanation) {
  if (isClickbait === true) {
    anchorElement.style.backgroundColor = '#ffa080'; // red
    anchorElement.innerHTML = `🪝 ${anchorElement.innerHTML}`;
    addTooltip(anchorElement, true, '🪝 This link is potential clickbait because: <br/>' + explanation);
  } else if (isClickbait === false) {
    anchorElement.style.backgroundColor = '#a5d46a'; // green
    anchorElement.innerHTML = `✅ ${anchorElement.innerHTML}`;
    addTooltip(anchorElement, false, '✅ This link DOES NOT seem potential clickbait because: <br/>' + explanation);
  } else {
    anchorElement.style.backgroundColor = '#ffff80'; // yellow
    anchorElement.innerHTML = `❔ ${anchorElement.innerHTML}`;
    addTooltip(anchorElement, null, 'Clickbait analysis not available for this link. ' + explanation);
  }
}


async function getLinkTextClickbaitVerdict(anchorElement) {
  if (anchorElement.hasChildNodes()) { // the father
    if (!anchorElement.childNodes[0].hasChildNodes() && anchorElement.childNodes[0].textContent.trim() != '') { // the child without childs.

      const textLink = anchorElement.childNodes[0].textContent.trim();
      // Get the text content, trim leading/trailing spaces, and split by whitespace
      const words = textLink.split(/\s+/);

      if (words.length >= MIN_WORDS_IN_LINKS) {

        if (!session) session = await ai.languageModel.create();

        let result = null;
        try {
          result = await session.prompt(clickbait_prompt.replace('{}', textLink));
          console.log('MODEL INPUT LINK: ' + textLink);
          console.log('MODELRESULT: ' + result);

          result = sanitizeModelResult(result);
          // console.log('MODELRESULTTRANSLATED A: ' + result);

          let resultJson = JSON.parse(result);

          if (resultJson.is_clickbait == true) {
            count_links_clickbait++;
            highlightLinkAndAddTooltip(anchorElement, true, resultJson.explanation);
          } else {
            count_links_not_clickbait++;
            highlightLinkAndAddTooltip(anchorElement, false, resultJson.explanation);
          }
        } catch (e) {
          console.log('Error in Prompt API: ' + e);

          highlightLinkAndAddTooltip(anchorElement, null, e + ' | ' + result); // TODO: remove error verbose.
          result = null;
        }
      } else {
        return null;
      }
    }

    return getLinkTextClickbaitVerdict(anchorElement.childNodes[0]); // get only 1st child. Recursive.
  } else {
    // console.log('DEBTITULAR: ' + anchorElement.textContent.trim());
    return anchorElement.textContent.trim();
  }
}


async function getCleanLinksFromWeb(MAX_NUM_LINKS) {

  count_links_analyzed = 0;
  count_links_clickbait = 0;
  count_links_not_clickbait = 0;

  const nodesHTML = document.querySelectorAll('a');
  let i = 0;
  for (let one of nodesHTML) {
    if (i == MAX_NUM_LINKS) break;

    let textContent = await getLinkTextClickbaitVerdict(one);
    if (textContent != null && textContent != '') {
      i++;

      chrome.runtime.sendMessage({ count_links_analyzed, count_links_clickbait, count_links_not_clickbait }, function (response) {
        // console.log('Message sent: ' + count_links_analyzed);
      });
    } else {
      // console.log('DEBEMPTY');
    }
    count_links_analyzed++;
  }
  chrome.runtime.sendMessage({ scan_completed: true, count_links_analyzed, count_links_clickbait, count_links_not_clickbait }, function (response) {
    console.log('Message sent. Num of links analyzed: ' + count_links_analyzed);
  });
}


function getCleanTextFromWeb(elem) {
  const nodesHTML = elem.querySelectorAll('h1, h2, h3, p'); //, td, caption, a, figcaption'); // , span, div, i, b');
  let nodesText = []; // version texto
  let allText = '';
  for (let one of nodesHTML) {
    nodesText.push(one.textContent);
    if (one.textContent.length > 0 && allText.includes(one.textContent) == false && one.textContent.includes('font-style') == false) {
      allText += one.textContent + '. ';
    }
  }

  allText = allText.substring(0, 3500); // limit 3500 chars to accomodate the SummarizationAPI max input.
  return allText;
}