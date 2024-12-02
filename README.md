# clickbait-fixer-chrome-extension

It detects and fixes clickbait links with AI locally!

## Key features

1. Scans the links of any website, and **marks the clickbaits in red and the headlines that are not clickbait in green**. To do this, it uses a local AI API (**Prompt API**).
2. Based on the number of clickbaits on the website, it generates a **clickbait score for that website**. The score will be a value between 0 (all links are clickbaits) and 100 (no clickbaits).
3. It adds an **awesome tooltip to each link**, with the following information: **why it is or is not clickbait; and a non-clickbait alternative headline suggestion**.
4. You read that right! The non-clickbait alternative title suggestion is generated by automatically **downloading the link destination and summarizing it locally** (**Summarization API**).
## Prerequisites

This project uses experimental Chrome APIs to leverage **AI locally**. You have to enable these features in your Chrome browser before using this Chrome extension:

1. Open a new tab in Chrome, go to `chrome://flags/#optimization-guide-on-device-model`. Select there `Enabled BypassPerfRequirement`.
2. For **Prompt API** `chrome://flags/#prompt-api-for-gemini-nano` (Prompt API is available, behind an experimental flag, from Chrome 127+ on **desktop** platforms). Select there `Enabled`.
3. For **Summarization API**  `chrome://flags/#summarization-api-for-gemini-nano` (Summarization API is available behind an experimental flag, from Chrome 129+ on **desktop** platforms).


## Other resources

- https://github.com/WICG/writing-assistance-apis
- https://developer.chrome.com/docs/extensions
- https://googlechromeai.devpost.com/
- https://developer.chrome.com/docs/ai/summarizer-api