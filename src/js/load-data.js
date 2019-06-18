/* global d3 */
/* usage
	import loadData from './load-data'
	loadData().then(result => {

	}).catch(console.error)
*/

function createFullName(str) {
  const [lastRaw, first] = str
    .trim()
    .split(',')
    .map(v => v.trim());

  const p = lastRaw.split(')').map(v => v.trim().replace('(', ''));
  const last = p.length === 1 ? p[0] : p[1];
  const role = p.length === 2 ? p[0] : null;
  return { first, last, role };
}

function parseName(str) {
  if (!str || !str.length) return null;
  return str.split('|').map(createFullName);
}

function clean(data) {
  return data.map(d => ({
    ...d,
    TitleClean: d.TitleClean.trim(),
    Subtitle: d.Subtitle.trim(),
    AuthorClean: parseName(d.AuthorClean),
    AuthorMore: parseName(d.AuthorMore),
    GoodreadsRating: Math.round(+d.GoodreadsRating * 2) / 2, /* round to nearest half*/
    GoodreadsReviews: +d.GoodreadsReviews,
    PubYear: +d.PubYear.trim(),
    Flourish: d.TitleClean.length < 30 ? Math.random() : 1,
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
