/* global d3 */
import loadData from './load-data';

let bookData = null;

function resize() {}

function setup() {
  console.table(bookData);
}

async function init() {
  try {
    bookData = await loadData();
    setup();
  } catch (err) {
    console.log(err);
  }
}

export default { init, resize };
