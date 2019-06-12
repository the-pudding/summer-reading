/* global d3 */
import Fitty from 'fitty';
import EnterView from 'enter-view';
import noUiSlider from 'nouislider';
import COLORS from './colors';
import loadData from './load-data';

const $graphic = d3.select('#graphic');
const $sidebar = d3.select('#sidebar');
const $mini = d3.select('#minimap');
const $miniGraphic = $mini.select('.minimap__graphic');
const $miniTitle = $mini.select('.minimap__hed');
const $miniCount = $miniTitle.select('span');
const $slider = $sidebar.select('.slider');
const $buttons = $sidebar.selectAll('.nav__sort-button');

let $book = null;
let $bookM = null;

const REM = 16;
const MAX_YEAR = 2010;
const MIN_YEAR = 1880;

const scaleColor = d3
  .scaleQuantize()
  .range(COLORS)
  .nice();

const filters = { keyword: false, years: [MIN_YEAR, MAX_YEAR - 5] };

let bookData = [];
let rawData = [];
let miniRatio = 0;
let numBooks = 0;

function setSizes() {
  const pad = REM * 2;
  const ratio = 1 / 6;
  const pageH = window.innerHeight;
  const sidebarW = $sidebar.node().offsetWidth;
  const miniGraphicW = $miniGraphic.node().offsetWidth;
  const baseW = sidebarW + miniGraphicW - pad;
  const baseH = baseW * ratio;

  const sizes = d3.range(numBooks).map(() => {
    const w = Math.floor(baseW + Math.random() * baseW * 0.25);
    const h = Math.floor(baseH + Math.random() * baseH * 0.33);
    return { width: w, height: h };
  });

  $book.each((d, i, n) => {
    const { width, height } = sizes[i];
    d3.select(n[i]).style('width', `${width}px`);
    d3.select(n[i]).style('height', `${height}px`);
  });

  const miniContainerH = pageH - $miniTitle.node().offsetHeight;

  const miniH = Math.max(1, Math.floor(miniContainerH / numBooks));
  const maxBookW = d3.max(sizes, d => d.width);
  miniRatio = maxBookW / (miniGraphicW * 0.2);

  $bookM.each((d, i, n) => {
    const { width } = sizes[i];
    d3.select(n[i]).style('width', `${Math.floor(width / miniRatio)}px`);
    d3.select(n[i]).style('height', `${miniH}px`);
  });
}

function applyFilters(d) {
  let onScreen = true;

  Object.keys(filters).forEach(k => {
    if (filters[k]) {
      onScreen =
        d.PubYear >= +filters.years[0] && d.PubYear <= +filters.years[1];
    }
  });

  return onScreen;
}

function stackBook({ graphic, posX }) {
  const graphicW = graphic.node().offsetWidth;
  const centerX = graphicW / 2;
  const offX = graphicW * 1.5;
  const posY = 0;

  // graphic.selectAll('.book').each((d, i, n) => {
  //   const $b = d3.select(n[i]);
  //   const mini = $b.classed('book--mini');
  //   const factor = mini ? miniRatio : 1;
  //   const state = applyFilters(d);
  //   d.previousState = state;

  //   const updateX = `${centerX + posX[i] / factor}px`;
  //   const enterX = `${-offX}px`;
  //   const exitX = `${offX}px`;

  //   if (state === 'enter') {
  //     $b.style('left', enterX).style('top', `${posY}px`);
  //   }

  //   const animateX = state === 'exit' ? exitX : updateX;
  //   const animateY = state === 'exit' ? $b.style('top') : `${posY}px`;

  //   $b.transition()
  //     .duration(500)
  //     .delay((posY * factor) / 10)
  //     .ease(d3.easeCubicInOut)
  //     .style('top', animateY)
  //     .style('left', animateX);

  //   if (state !== 'exit') posY += $b.node().offsetHeight;
  // });

  // graphic.style('height', `${posY}px`);

  $miniCount.text(bookData.length);
}

function stack() {
  const damp = 1 / numBooks;
  const scaleSin = $graphic.node().offsetWidth * 0.05;
  const scaleOff = 10;

  const posX = d3.range(numBooks).map(i => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const offset = i === 0 ? 0 : Math.random() * dir * scaleOff;
    return Math.sin(i * damp * Math.PI * 2) * scaleSin + offset;
  });

  bookData = rawData.filter(applyFilters);

  stackBook({ graphic: $graphic, posX });
  stackBook({ graphic: $miniGraphic, posX });
}

function resizeFit() {
  const h = [];
  $book.each((d, i, n) => h.push(n[i].offsetHeight));
  const maxSize = d3.min(h) / 2;
  const minSize = 16;
  Fitty('.book__title', {
    minSize,
    maxSize,
    // multiLine: false,
  });
}

function resize() {
  setSizes();
  stack();
  resizeFit();
}

function sortData(slug) {
  let $sorted = null;
  let $miniSorted = null;

  if (slug === 'author')
    $sorted = $book.sort((a, b) => {
      if (a.author && b.author) {
        const authorA = a.author[0].last;
        const authorB = b.author[0].last;
        return d3.ascending(authorA, authorB);
      }
    });
  else $sorted = $book.sort((a, b) => d3.ascending(a[slug], b[slug]));

  if (slug === 'author')
    $miniSorted = $bookM.sort((a, b) => {
      if (a.author && b.author) {
        const authorA = a.author[0].last;
        const authorB = b.author[0].last;
        return d3.ascending(authorA, authorB);
      }
    });
  else $miniSorted = $bookM.sort((a, b) => d3.ascending(a[slug], b[slug]));

  $book = $sorted;
  $bookM = $miniSorted;
}

function handleSort() {
  const sel = d3.select(this);
  const slug = sel.attr('data-slug');
  const $sorted = sortData(slug);

  $buttons.classed('is-active', false);
  sel.classed('is-active', true);
  // filters.keyword = !filters.keyword;
  stack();
}

function setupSort() {
  $buttons.on('click', handleSort);
}

function setupUIEnter() {
  EnterView({
    selector: '#graphic',
    enter: () => {
      $sidebar.classed('is-visible', true);
      $mini.classed('is-visible', true);
    },
    exit: () => {
      $sidebar.classed('is-visible', false);
      $mini.classed('is-visible', false);
    },
    offset: 0.5,
    once: true,
  });
}

function handleSlide(value) {
  const [start, end] = value;
  filters.years = [+start, +end];
  stack();
}

function setupSlider() {
  const start = [MIN_YEAR, MAX_YEAR - 5];
  const slider = noUiSlider.create($slider.node(), {
    start,
    step: 5,
    connect: true,
    tooltips: [
      {
        to: value => +value,
      },
      {
        to: value => +value,
      },
    ],
    range: {
      min: MIN_YEAR,
      max: MAX_YEAR,
    },
  });

  slider.on('change', handleSlide);
}

function setupUI() {
  setupSort();
  setupUIEnter();
  setupSlider();
}

function setupFigures() {
  const yearRange = [MIN_YEAR, MAX_YEAR];
  scaleColor.domain(yearRange);
  numBooks = bookData.length;
  bookData.sort((a, b) => d3.ascending(a.TitleClean, b.TitleClean));

  $book = $graphic
    .selectAll('.book')
    .data(bookData)
    .join('div')
    .attr('class', 'book')
    .style('background-color', d => scaleColor(d.PubYear));

  $bookM = $miniGraphic
    .selectAll('.book')
    .data(bookData)
    .join('div')
    .attr('class', 'book book--mini')
    .style('background-color', d => scaleColor(d.PubYear));

  $book
    .append('h4')
    .attr('class', 'book__title')
    .text(d => d.TitleClean);
}

async function init() {
  rawData = await loadData();
  bookData = rawData;
  setupFigures();
  setupUI();
  resize();
}

export default { init, resize };
