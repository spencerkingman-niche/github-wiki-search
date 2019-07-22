# github-wiki-search
A tool for searching the Github Wikis via CLI or a slackbot.

# Getting Started
1. You'll need node and npm, but you probably already have those...
1. Clone this repo: `git clone https://github.com/spencerkingman-niche/github-wiki-search.git`
1. Enter the project: `cd github-wiki-search`
1. Install the dependencies: `npm install`
1. Clone the wiki you want to search: `git clone ssh://git@github.com/nicheinc/wiki.wiki.git wiki`
1. Index the wiki: `node indexer.js 'https://github.com/nicheinc/wiki/wiki' > wiki-data.json`
1. Search via the CLI: `node search.js 'animations'`
1. Run the express server: `nf start`
    1. I am using ngrok to expose my local express server to Slack.

I will write some documentation about how it works and some notes on the slack integration later. --SK

# Reference
I primarily used these examples:
- https://www.codementor.io/rudolfolah/node-js-search-engine-github-s2gh0sfl8#Why-do-we-need-a-search-engine-for-Github-wikis?
- https://girliemac.com/blog/2016/10/24/slack-command-bot-nodejs/
- https://dashboard.ngrok.com/get-started
