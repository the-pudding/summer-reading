import { longStackSupport } from 'q';

/* global d3 */

const $graphic = d3.select('#graphic');
const $book = $graphic.selectAll('.book');
const $sidebar = d3.select('#sidebar')

const bookData = null;

function resize() {}

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

function cleanDatum(d) {
  const numberAttr = ['year'];
  const splitAttr = ['author', 'contributor'];
  const output = {};
  Object.keys(d).forEach(k => {
    if (numberAttr.includes(k)) output[k] = +d[k];
    else if (splitAttr.includes(k)) output[k] = parseName(d[k]);
    else output[k] = d[k];
  });
  return output;
}

function bindData() {
  const dataAttr = ['year', 'title', 'author', 'contributor'];

  const el = this;
  const $b = d3.select(el);
  const datum = {};

  dataAttr.forEach(attr => (datum[attr] = $b.attr(`data-${attr}`)));
  datum.size = setSize()
  el.__data__ = cleanDatum(datum);
}

function setSize(){
  const baseW = 480;
  const baseH = 72;
  const w = Math.floor(baseW + Math.random() * baseW * 0.25);
  const h = Math.floor(baseH + Math.random() * baseH * 0.33);
  return {width: w, height: h}
}

function colorBooks(d){
  const yearRange = [1884, 2017]
  const colors = ['#3e93ad', '#5f9ba0', '#79a392', '#90ab82', '#a5b271', '#bab85d', '#cebd45', '#e2c222', '#e1ba1d', '#e1af18', '#e2a113', '#e38f0e', '#e47909', '#e45d07', '#e43307']
  const colorScale = d3.scaleQuantize()
    .domain(yearRange)
    .range(colors)

  return colorScale(d)
}

function sortData(slug){
  let $sorted = null

  console.log(slug)
  if (slug === 'random') $sorted = $book.sort(() => Math.random() - 0.5 )
  else if (slug === 'author') $sorted = $book.sort((a, b) => {
    if (a.author && b.author){
      let authorA = a.author[0].last
      let authorB = b.author[0].last
      return d3.ascending(authorA, authorB)}
  })
  else $sorted = $book.sort((a, b) => d3.ascending(a[slug], b[slug]))

  return $sorted
}

function handleSort(){
  const sel = d3.select(this)
  const slug = sel.attr('data-slug')

  let $sorted = sortData(slug)

  stack($sorted)
}

function setupSort(){
  const buttons = $sidebar.selectAll('.nav__sort-button')

  buttons.on('click', handleSort)
}

function setupUI(){
  setupSort()
}

function stack(sel) {
  const damp = 1 / $book.size();
  const scaleSin = 1;
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
    $b.style('background', colorBooks(d.year))
    const dir = Math.random() < 0.5 ? -1 : 1;
    const offset = Math.random() * dir * scaleOff;
    const acc = Math.random();
    posX += Math.sin(i * damp * acc) * scaleSin + offset;
    // posX = offset;
    posY += h;
  });
}

function setup() {
  $book.each(bindData);
  stack($book);
  setupUI()
}

async function init() {
  setup();
}

export default { init, resize };
