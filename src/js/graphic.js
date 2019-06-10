/* global d3 */
import cleanDatum from './clean-datum';
import COLORS from './colors';

const $graphic = d3.select('#graphic');
const $book = $graphic.selectAll('.book');
const $sidebar = d3.select('#sidebar');
const filters = { keyword: false };
const $miniGraphic = d3.select('#minimap');
const $mini = $miniGraphic.selectAll('.book');

const REM = 16;
const MAX_YEAR = 2010;
const MIN_YEAR = 1880;
const NUM_BOOKS = $book.size();

const scaleColor = d3
  .scaleQuantize()
  .range(COLORS)
  .nice();
let miniRatio = 0;

function setSizes() {
  const pad = REM * 2;
  const ratio = 1 / 6;
  const sidebarW = $sidebar.node().offsetWidth;
  const miniGraphicW = $miniGraphic.node().offsetWidth;
  const baseW = sidebarW + miniGraphicW - pad;
  const baseH = baseW * ratio;

  const sizes = d3.range(NUM_BOOKS).map(() => {
    const w = Math.floor(baseW + Math.random() * baseW * 0.25);
    const h = Math.floor(baseH + Math.random() * baseH * 0.33);
    return { width: w, height: h };
  });

  $book.each((d, i, n) => {
    const { width, height } = sizes[i];
    d3.select(n[i]).style('width', `${width}px`);
    d3.select(n[i]).style('height', `${height}px`);
  });

  const miniH = Math.max(1, Math.floor(window.innerHeight / NUM_BOOKS));
  const maxBookW = d3.max(sizes, d => d.width);
  miniRatio = maxBookW / (miniGraphicW * 0.33);

  $mini.each((d, i, n) => {
    const { width } = sizes[i];
    d3.select(n[i]).style('width', `${Math.floor(width / miniRatio)}px`);
    d3.select(n[i]).style('height', `${miniH}px`);
  });
}

function resize() {
  setSizes();
  stack();
}

function bindData() {
  const dataAttr = ['year', 'title', 'author', 'contributor'];

  const el = this;
  const $b = d3.select(el);
  const datum = {};

  dataAttr.forEach(attr => (datum[attr] = $b.attr(`data-${attr}`)));
  el.__data__ = cleanDatum(datum);
}

function makeMini() {
  console.log($book.nodes()[0]);
  $mini.each((d, i, n) => {
    const bigBook = $book.nodes()[i];
    const bigColor = d3.select(bigBook).style('background');
    const $m = d3.select(n[i]);
    $m.style('background', bigColor);
  });
}

function applyFilters(d) {
  let onScreen = true;
  Object.keys(filters).forEach(k => {
    if (filters[k]) {
      onScreen = d.year === 2016;
    }
  });
  if (onScreen && d.previousState === 'exit') return 'enter';
  if (!onScreen && d.previousState === 'update') return 'exit';
  return 'update';
}

function stackBook({ graphic, posX }) {
  const graphicW = graphic.node().offsetWidth;
  const centerX = graphicW / 2;
  const offX = graphicW * 1.5;
  let posY = 0;

  graphic.selectAll('.book').each((d, i, n) => {
    const $b = d3.select(n[i]);
    const mini = $b.classed('book--mini');
    const factor = mini ? miniRatio : 1;
    const filterState = applyFilters(d);
    d.previousState = filterState;
    if (filterState === 'enter') $b.style('left', `-${offX}px`);
    const animateX =
      filterState === 'exit' ? `${offX}px` : `${centerX + posX[i] / factor}px`;

    $b.transition()
      .duration(5000)
      .ease(d3.easeCircleOut)
      .style('top', `${posY}px`)
      .style('left', animateX);

    if (filterState !== 'exit') posY += $b.node().offsetHeight;
  });
}

function stack() {
  const damp = 1 / NUM_BOOKS;
  const scaleSin = $graphic.node().offsetWidth * 0.05;
  const scaleOff = 10;

  const posX = d3.range(NUM_BOOKS).map(i => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const offset = i === 0 ? 0 : Math.random() * dir * scaleOff;
    return Math.sin(i * damp * Math.PI * 2) * scaleSin + offset;
  });

  stackBook({ graphic: $graphic, posX });
  stackBook({ graphic: $miniGraphic, posX });
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
  // const sel = d3.select(this);
  // const slug = sel.attr('data-slug');
  // const $sorted = sortData(slug);
  filters.keyword = !filters.keyword;
  const $sorted = $book;
  stack($sorted);
}

function setupSort() {
  const buttons = $sidebar.selectAll('.nav__sort-button');
  buttons.on('click', handleSort);
}

function setupUI() {
  setupSort();
}

function colorBg(d) {
  d3.select(this).style('background-color', scaleColor(d.year));
}

function colorize() {
  const data = $book.data();
  const yearRange = [MIN_YEAR, MAX_YEAR];
  // const yearRange = [1884, 2004];
  scaleColor.domain(yearRange);
  console.log(COLORS.length);
  console.log(scaleColor.thresholds());
  $book.each(colorBg);
  $mini.each(colorBg);
}

function setup() {
  $book.each(bindData);
  $mini.each(bindData);
  colorize();
  stack();
  makeMini();
  setupUI();
  resize();
}

async function init() {
  setup();
}

export default { init, resize };
