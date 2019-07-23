'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const wikiData = require('./wiki-data.json');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(3001, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);});

  // highlight the query in the response text 
  function _highlightQuery(query, text) {
    const searchMask = new RegExp(query, "ig");
    const highlightedText = text.replace(searchMask, function(match){
      return `*${_matchCase(query, match)}*`
    })
    return highlightedText
  }
  
  // Utility func for preserving case when highlighting query in response text
function _matchCase(text, pattern) {
    var result = '';
    for(var i = 0; i < text.length; i++) {
        var c = text.charAt(i);
        var p = pattern.charCodeAt(i);

        if(p >= 65 && p < 65 + 26) {
            result += c.toUpperCase();
        } else {
            result += c.toLowerCase();
        }
    }
    return result;
}

// remove '---' and Highlight the heading
function _formatHeading(text) {
  const formattedText = text.replace('---', '  ')
  return `_${formattedText}_` 
}

app.post('/', (req, res) => {
  // let text = req.body.text;
  const query = req.body.text.replace('-', '').toLowerCase();
  console.log('query:', query)

  // If the user has typed `/wiki help`
  if (query === 'help' || query === '') {
    const data = {
      "response_type": "ephemeral",
      "text": "*How to use /wiki*",
      "attachments":[
          {
             "text":"To search the NicheInc GitHub Wikis, use `/wiki {YOUR_QUERY}`. For example, `/wiki kubernetes`.\n\nYou've already learned how to get help with `/wiki` or `/wiki help`."
          }
      ]
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
  
  // prepare text ouput of response
  for (var id in result) {
    const item = result[id];
    resultText += '-----------------------------------------\n\n';
    resultText += _highlightQuery(query, _formatHeading(`${item.title} - ${item.heading}`)) + '\n';
    resultText += `${item.heading_url}\n\n`;
    resultText += _highlightQuery(query, item.content) + '\n\n';
  }

  // TODO: handle the no_text error
  if (resultText === '') {
    resultText = `Sorry, *no results* were found for the query \`${req.body.text}\`.\n\n_Note: As of now, multi-word strings will only return results if the query words occur in the wiki in the same order they were entered._`
  }

  // Return the data
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
