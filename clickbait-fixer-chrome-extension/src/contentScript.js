import { Readability } from '@mozilla/readability';

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

let template_for_custom_prompts = `Answer the following instruction using the following context. Respond directly in plain text, don't use JSON.

Instruction: {instruction}

Context: {context}`;

let session = null;
let summarizer = null;

let count_links_analyzed = 0;
let count_links_clickbait = 0;
let count_links_not_clickbait = 0;


let tooltip = null;

const parser = new DOMParser();

function downloadSync(link) {
  let ret = null;

  $.ajax({
    async: false,
    url: link,
    type: 'GET',
    success: function (result) {
      // console.log('OK downloaded. Raw: ' + JSON.stringify(result));
      ret = result;
    },
    error: function (error) {
      console.log('error downloading: ' + JSON.stringify(error));
    }
  });

  return ret;
}


function downloadSyncAndClean(link) {
  let ret = downloadSync(link);

  if (ret) {
    const tempDom = parser.parseFromString(ret, "text/html");
    let readable = new Readability(tempDom).parse().textContent;
    readable = readable.substring(0, 3500); // limit 3500 chars to accomodate the SummarizationAPI max input.
    // console.log('------- readable: ' + readable);

    return readable;
  }
  return null;
}


async function loadSummarizer() {
  if (!summarizer) {
    summarizer = await ai.summarizer.create({
      type: "headline", // "tl;dr"
      length: "short",
      format: "plain-text",
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Downloading summarizer model. Downloaded ${e.loaded} of ${e.total} bytes.`);
        });
      }
    });
  }
}


async function downloadAndSummarize(link) {
  
  let readable = downloadSyncAndClean(link);

  if (readable) {
    let lblSummaryInTooltip = null;
    try {
      await loadSummarizer();

      let modelResultReadable = await summarizer.summarize(readable); 

      lblSummaryInTooltip = document.getElementById("lblSummaryInTooltip");
      if (lblSummaryInTooltip) {
        lblSummaryInTooltip.innerHTML = '🤖 Non-clickbait headline proposed by AI after reading the destination:<br/>' + modelResultReadable;
      }

      // // title with 5 W's.
      // const prompt = template_for_custom_prompts.replace('{instruction}', "Give me the 5 W's of journalism in a single news headline, avoiding clickbait.").replace('{context}', readable);
      // if (!session) session = await ai.languageModel.create();
      // let modelResult = await session.prompt(prompt);

      // if (modelResult) {
      //    lblSummaryInTooltip.innerHTML += `</br></br>🤖 <strong>${modelResult}</strong>`;
      // }

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


async function getLinkTextClickbaitVerdict(anchorElement, ignoreMinLinkSize) {
  if (anchorElement.hasChildNodes()) { // the father
    if (!anchorElement.childNodes[0].hasChildNodes() && anchorElement.childNodes[0].textContent.trim() != '') { // the child without childs.

      const textLink = anchorElement.childNodes[0].textContent.trim();
      // Get the text content, trim leading/trailing spaces, and split by whitespace
      const words = textLink.split(/\s+/);

      if (ignoreMinLinkSize == true || words.length >= MIN_WORDS_IN_LINKS) {

        if (!session) session = await ai.languageModel.create();

        let result = null;
        try {
          result = await session.prompt(clickbait_prompt.replace('{}', textLink));

          result = sanitizeModelResult(result);

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

    return getLinkTextClickbaitVerdict(anchorElement.childNodes[0], ignoreMinLinkSize); // get only 1st child. Recursive.
  } else {
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

    let textContent = await getLinkTextClickbaitVerdict(one, false);
    if (textContent != null && textContent != '') {
      i++;

      chrome.runtime.sendMessage({ count_links_analyzed, count_links_clickbait, count_links_not_clickbait }, function (response) {});
    }
    count_links_analyzed++;
  }
  chrome.runtime.sendMessage({ scan_completed: true, count_links_analyzed, count_links_clickbait, count_links_not_clickbait }, function (response) {
    console.log('Message sent. Num of links analyzed: ' + count_links_analyzed);
  });
}


function findAnchorByLink(link) {
  const anchors = document.querySelectorAll('a');
  const filt = Array.from(anchors).filter(anchor => anchor.href === link);
  return filt;
}


chrome.runtime.onMessage.addListener(
  async function (request, sender, sendResponse) {

    if (request.type == 'contextMenuCheckClickbaitLink') {
      let elemAnchors = findAnchorByLink(request.linkUrl);

      for (const one of elemAnchors) {
        await getLinkTextClickbaitVerdict(one, true);
      }
    } else if (request.type == 'reviewAllLinks') {
      chrome.storage.sync.get("MAX_NUM_LINKS", async ({ MAX_NUM_LINKS }) => {
        await getCleanLinksFromWeb(MAX_NUM_LINKS);
      });
    } else if (request.type == 'contextMenuCustomPrompt1') {

      chrome.storage.sync.get("CUSTOM_PROMPT_1", async ({ CUSTOM_PROMPT_1 }) => {
        if (CUSTOM_PROMPT_1 == null || CUSTOM_PROMPT_1.length == 0) {
          alert('Custom prompt not defined by you yet. Go to Settings first.');
          return;
        }

        let readable = downloadSyncAndClean(request.linkUrl);
        if (!readable) {
          alert('Error downloading and cleaning the destination.');
          return;
        }

        const prompt = template_for_custom_prompts.replace('{instruction}', CUSTOM_PROMPT_1).replace('{context}', readable);

        try{
          if (!session) session = await ai.languageModel.create();

          let modelResult = await session.prompt(prompt);

          alert(modelResult);
        } catch(e) {
          alert('Error answering your custom prompt :( . ' + JSON.stringify(e));
        }
      });
    }
  }
);