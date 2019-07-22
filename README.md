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

I will provide some notes about how the slack integration works later. --SK
