/* global d3 */
import cleanDatum from './clean-datum';
import COLORS from './colors';

const $graphic = d3.select('#graphic');
const $book = $graphic.selectAll('.book');
const $sidebar = d3.select('#sidebar');

function resize() {}

function setSize() {
  const baseW = 480;
  const baseH = 72;
  const w = Math.floor(baseW + Math.random() * baseW * 0.25);
  const h = Math.floor(baseH + Math.random() * baseH * 0.33);
  return { width: w, height: h };
}

function bindData() {
  const dataAttr = ['year', 'title', 'author', 'contributor'];

  const el = this;
  const $b = d3.select(el);
  const datum = {};

  dataAttr.forEach(attr => (datum[attr] = $b.attr(`data-${attr}`)));
  datum.size = setSize();
  el.__data__ = cleanDatum(datum);
}

function colorBooks(d) {
  const yearRange = [1884, 2017];
  const colorScale = d3
    .scaleQuantize()
    .domain(yearRange)
    .range(COLORS);

  return colorScale(d);
}

function stack(sel) {
  const damp = 1 / $book.size();
  const scaleSin = 2;
  const scaleOff = 10;
  let posY = 0;
  let posX = 0;

  const graphicW = $graphic.node().offsetWidth;
  const centerX = graphicW / 2;

  sel.each((d, i, n) => {
    const $b = d3.select(n[i]);
    const w = d.size.width;
    const h = d.size.height;
    $b.style('width', `${w}px`);
    $b.style('height', `${h}px`);

    $b.transition()
      .duration(500)
      .ease(d3.easeCircleOut)
      .style('top', `${posY}px`);
    $b.style('left', `${centerX + posX}px`);
    $b.style('background', colorBooks(d.year));
    const dir = Math.random() < 0.5 ? -1 : 1;
    const offset = Math.random() * dir * scaleOff;
    // const acc = Math.random();
    posX += Math.sin(Math.PI / 2 + i * damp * Math.PI * 2) * scaleSin + offset;
    // posX = offset;
    posY += h;
    console.log(i * damp);
  });
}

function sortData(slug) {
  let $sorted = null;

  if (slug === 'random') $sorted = $book.sort(() => Math.random() - 0.5);
  else if (slug === 'author')
    $sorted = $book.sort((a, b) => {
      if (a.author && b.author) {
        const authorA = a.author[0].last;
        const authorB = b.author[0].last;
        return d3.ascending(authorA, authorB);
      }
    });
  else $sorted = $book.sort((a, b) => d3.ascending(a[slug], b[slug]));

  return $sorted;
}

function handleSort() {
  const sel = d3.select(this);
  const slug = sel.attr('data-slug');
  const $sorted = sortData(slug);
  stack($sorted);
}

function setupSort() {
  const buttons = $sidebar.selectAll('.nav__sort-button');
  buttons.on('click', handleSort);
}

function setupUI() {
  setupSort();
}

function setup() {
  $book.each(bindData);
  stack($book);
  setupUI();
}

async function init() {
  setup();
}

export default { init, resize };
