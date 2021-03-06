'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const wikiData = require('./wiki-data.json');

const MAX_VISIBLE_RESULTS = 35

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const server = app.listen(3001, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

// highlight the query in the response text 
function _highlightQuery(query, text) {
  const searchMask = new RegExp(query, "ig");
  const highlightedText = text.replace(searchMask, function (match) {
    return `*${_matchCase(query, match)}*`
  })
  return highlightedText
}

// Utility func for preserving case when highlighting query in response text
function _matchCase(text, pattern) {
  var result = '';
  for (var i = 0; i < text.length; i++) {
    var c = text.charAt(i);
    var p = pattern.charCodeAt(i);

    if (p >= 65 && p < 65 + 26) {
      result += c.toUpperCase();
    } else {
      result += c.toLowerCase();
    }
  }
  return result;
}

// remove '---' and Highlight the heading
function _formatHeading(title, heading) {
  const text = title === heading ? title : `${title}\t#${heading}`
  const formattedText = text.replace('---', '  ')
  return `_${formattedText}_`
}

app.post('/', (req, res) => {
  const query = req.body.text.replace('-', '').toLowerCase();
  console.log('query:', query)

  // If the user has typed `/wiki help`
  if (query === 'help' || query === '') {
    const data = {
      "response_type": "ephemeral",
      "text": "*How to use /wiki*",
      "attachments": [{
        "text": "To search the NicheInc GitHub Wikis, use `/wiki {YOUR_QUERY}`. For example, `/wiki kubernetes`.\n\nYou've already learned how to get help with `/wiki` or `/wiki help`."
      }]
    }
    res.json(data)
    return
  }

  // If the user has typed a normal query
  let result = {};
  let resultText = ''
  for (var i = 0; i < wikiData.length; i += 1) {
    const item = wikiData[i];
    if (result[item.id]) {
      continue;
    }
    if (item.tags.indexOf(query) !== -1) {
      result[item.id] = item;
      // resultText += ('FOUND IN TAGS: ' + item.tags.join(', ') + '\n');
    } else if (item.content.indexOf(query) !== -1) {
      result[item.id] = item;
      // resultText += ('FOUND IN CONTENT: ' + item.content + '\n');
      // resultText += '=========================================\n\n';
    }
  }

  // Error case example
  // if(! /^\d+$/.test(q.text)) { // not a digit
  //  res.send('U R DOIN IT WRONG. Enter a status code like 200!');
  //  return;
  // }

  // Convert results to array and sort by date descending.
  let orderedResult = []
  let moreThanMaxVisibleResults = false
  for (let id in result) {
    orderedResult.push(result[id])
  }
  orderedResult.sort((itemA, itemB) => itemB.last_modified - itemA.last_modified)
  const totalResults = orderedResult.length

  if (totalResults > MAX_VISIBLE_RESULTS) {
    moreThanMaxVisibleResults = true
    orderedResult = orderedResult.slice(0, MAX_VISIBLE_RESULTS)
  }

  // prepare text ouput of response
  for (let i = orderedResult.length - 1; i >= 0; i--) {
    const item = orderedResult[i]
    const date = new Date(item.last_modified)
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(date)
    resultText += `--------------------------------------------- ${i+1} of ${totalResults}\n\n`;
    resultText += _highlightQuery(query, _formatHeading(item.title, item.heading)) + '\n';
    resultText += `${item.heading_url}\n`;
    resultText += `_${item.last_author.substring(0, item.last_author.indexOf('<')-1)}_ in ${formattedDate}\n\n`;
    resultText += `>${_highlightQuery(query, item.content)}\n\n`;
  }

  if (moreThanMaxVisibleResults) {
    resultText += `=============================\n\n`
    resultText += `_Only showing the ${MAX_VISIBLE_RESULTS} most recent commits that match your query..._`
  }

  // handle the no_text error
  if (resultText === '') {
    resultText = `Sorry, *no results* were found for the query \`${req.body.text}\`.\n\n_Note: As of now, multi-word strings will only return results if the query words occur in the wiki in the same order they were entered._`
  }

  // Return the data in a form that slack can render
  let data = {
    response_type: 'ephemeral', // Use 'in_channel' if you want it to be public to the channel
    text: resultText,
    // attachments:[
    //  {
    //    image_url: 'https://http.cat/302.jpg'
    //  }
    //]
  };
  res.json(data);
});