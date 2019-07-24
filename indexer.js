const fs = require('fs');
const path = require('path');
const walk = require('walk');
const stemmer = require('stemmer');
const commonmark = require('commonmark');
const crypto = require('crypto');
const nodegit = require('nodegit');

const wikiRepoPath = require("path").resolve("./wiki/.git");
const wikiUrlPrefix = process.argv[2];
const wikiDir = 'wiki/';
const walker = walk.walk('wiki/');
const stopWords = [
  'a',
  'able',
  'about',
  'across',
  'after',
  'all',
  'almost',
  'also',
  'am',
  'among',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'but',
  'by',
  'can',
  'cannot',
  'could',
  'dear',
  'did',
  'do',
  'does',
  'either',
  'else',
  'ever',
  'every',
  'for',
  'from',
  'get',
  'got',
  'had',
  'has',
  'have',
  'he',
  'her',
  'hers',
  'him',
  'his',
  'how',
  'however',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'least',
  'let',
  'like',
  'likely',
  'may',
  'me',
  'might',
  'most',
  'must',
  'my',
  'neither',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'often',
  'on',
  'only',
  'or',
  'other',
  'our',
  'own',
  'rather',
  'said',
  'say',
  'says',
  'she',
  'should',
  'since',
  'so',
  'some',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'tis',
  'to',
  'too',
  'twas',
  'us',
  'wants',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'would',
  'yet',
  'you',
  'your',
]

let index = Object.create(null);
fileCount = 0

// walker walks through a directory tree and list of files;
// used for finding all Markdown files in the wiki directory.
walker.on('file', async function (root, fileStats, next) {
  const fileName = fileStats.name;
  // For each file in the wiki directory, we'll know if it is a Markdown file or not by checking its extension.
  if (fileName.indexOf('.md') !== -1) {
    const pathName = path.join(wikiDir, fileName);
    const content = fs.readFileSync(pathName).toString();
    index[fileName] = await processFile(fileName, content);
  }
  next();
});

walker.on('errors', function (root, nodeStatsArray, next) {
  next();
});

walker.on('end', function () {
  let result = [];
  for (var fileName in index) {
    for (var i = 0; i < index[fileName].length; i += 1) {
      result.push(index[fileName][i]);
    }
  }
  console.log(JSON.stringify(result));
});

const getLastCommit = async (fileName) => {
  let commits = [];
  try {
    const repoForNodeGit = await nodegit.Repository.open(wikiRepoPath)
    const blame = await nodegit.Blame.file(repoForNodeGit, fileName)
    try {
      let count = 1;
      for (var i = 0; i < blame.getHunkCount(); i++) {
        var hunk = blame.getHunkByIndex(i);
        for (var j = 0; j < hunk.linesInHunk(); j++) {
          const commitId = hunk.finalCommitId().toString()
          const commit = await nodegit.Commit.lookup(repoForNodeGit, commitId)
          const commitTime = commit.timeMs()
          commits.push({
            author: hunk.finalSignature().toString(),
            time: commitTime,
            id: commitId,
          })
          count++;
        }
      }
    } catch (error) {
      console.log('[ indexer.js / processFile / parsing blame hunks ]', error)
    };
    const latestTime = new Date(Math.max.apply(null, commits.map(commit => {
      return new Date(commit.time);
    })));
    return commits.filter(commit => {
      var date = new Date(commit.time);
      return date.getTime() == latestTime.getTime();
    })[0];
  } catch (error) {
    console.log('[ indexer.js / processFile / getting repo and blames ]', error)
  };
}


// Process the file: 
// 1. Break down the title into tags
// 2. Break down the content
//     a. Group it by page heading and sub-headings
// 3. Convert the grouped content into indexed data
async function processFile(fileName, content, blame) {
  let result = [];

  const title = fileName.replace('.md', '');
  const tree = contentToMarkdownTree(content);
  const tags = processTitle(fileName, tree);
  const processedContent = processContent(title, tree);
  const lastCommit = await getLastCommit(fileName)

  for (var heading in processedContent) {
    const headingTags = breakIntoTags(heading);
    for (var i = 0; i < processedContent[heading].length; i += 1) {
      const item = processedContent[heading][i];
      const id = generateId(title, heading, item.content);

      const titleUrl = `${wikiUrlPrefix}/${title.replace(' ', '-')}`;
      let headingUrlSuffix = heading.toLowerCase().replace(/[\/\(\),.]/g, '').replace(/ /g, '-');

      const data = {
        last_author: lastCommit.author,
        last_modified: lastCommit.time,
        last_commit: lastCommit.id,
        id: id,
        title: title,
        title_url: titleUrl,
        heading: heading,
        heading_url: title == heading ? titleUrl : `${titleUrl}#${headingUrlSuffix}`,
        content: item.substring(0, 500),
        tags: tags.concat(breakIntoTags(item)).concat(headingTags)
      };
      result.push(data);
    }
  }
  return result;
}

// Use commonmark to parse the github markdown and turn it into a tree
function contentToMarkdownTree(content) {
  const reader = new commonmark.Parser();
  return reader.parse(content);
}

function processTitle(fileName) {
  const cleanFileName = fileName.replace('.md', '');
  const tags = breakIntoTags(cleanFileName);
  return tags;
}

function breakIntoTags(text) {
  let clean = text.replace(/[^a-zA-Z]/g, ' ');
  clean = clean.toLowerCase();
  clean = clean.split(' ');
  let tagsHash = Object.create(null);
  for (var i = 0; i < clean.length; i += 1) {
    if (shouldIgnoreWord(clean[i])) {
      continue;
    }
    const stemmed = stemmer(clean[i]);
    tagsHash[stemmed] = true;
    tagsHash[clean[i]] = true;
  }
  let tags = [];
  for (var key in tagsHash) {
    if (key.length > 0) {
      tags.push(key);
    }
  }
  return tags;
}

function shouldIgnoreWord(text) {
  return text.length === 1 || stopWords.indexOf(text) !== -1;
}

function processContent(title, tree) {
  const walker = tree.walker();
  let event, node;
  let currentHeading = null;
  let sections = {
    null: []
  };

  while ((event = walker.next())) {
    node = event.node;
    if (node.type === 'heading') {
      currentHeading = getNodeChildrenText(node);
    } else if (node.literal) {
      const text = node.literal.replace('\n', ' ').toLowerCase();
      if (sections[currentHeading]) {
        sections[currentHeading].push(text);
      } else {
        sections[currentHeading] = [text];
      }
    }
  }

  sections[title] = sections[null];
  delete sections[null];
  return sections;
}

function generateId() {
  const hash = crypto.createHash('sha256');
  hash.update.apply(hash, arguments);
  return hash.digest('hex');
}

function getNodeChildrenText(node) {
  let text = '';
  child = node.firstChild;
  if (child && child.literal) {
    do {
      text += child.literal;
    } while ((child = child.next));
  }
  return text;
}