// This is a version of the search tool that can be run with Node in terminal.
// Use with a query like `node search.js lottie`.
// There is similar code in the `index.js` file, but that is formatted for slack bot.

const query = process.argv[2].replace('-', '').toLowerCase();
const data = require('./wiki-data.json');
let result = {};

console.log('###########################################');
for (var i = 0; i < data.length; i += 1) {
  const item = data[i];
  if (result[item.id]) {
    continue;
  }

  if (item.tags.indexOf(query) !== -1) {
    result[item.id] = item;
    console.log('found in tags: ' + item.tags);
  } else if (item.content.indexOf(query) !== -1) {
    result[item.id] = item;
    console.log('found in content: ' + item.content);
  }
}

for (var id in result) {
  const item = result[id];
  console.log('\n============================================');
  console.log(`${item.title} - ${item.heading}`);
  console.log(`Link: ${item.heading_url}`);
  console.log();
  console.log(item.content);
}
