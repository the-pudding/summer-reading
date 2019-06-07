/* global d3 */
/* usage
	import loadData from './load-data'
	loadData().then(result => {

	}).catch(console.error)
*/

function clean(data) {
  return data.map(d => ({
    ...d,
    AuthorClean: d.AuthorClean.split('|'),
    GoodreadsRating: +d.GoodreadsRating,
    GoodreadsReviews: +d.GoodreadsReviews,
    PubYear: +d.PubYear,
  }));
}

export default function loadData() {
  return new Promise((resolve, reject) => {
    d3.json(`assets/data/books.json`)
      .then(clean)
      .then(resolve)
      .catch(reject);
  });
}
