/* global d3 */
import EnterView from 'enter-view';
import noUiSlider from 'nouislider';
import cleanDatum from './clean-datum';
import COLORS from './colors';

const $graphic = d3.select('#graphic');
let $book = $graphic.selectAll('.book');
const $sidebar = d3.select('#sidebar');

const $miniGraphic = d3.select('#minimap');
const $miniCont = $miniGraphic.select('.minimap__container')
let $mini = $miniGraphic.selectAll('.book');
const $miniTitle = $miniGraphic.select('.minimap__hed');
const $miniCount = $miniTitle.select('span')
const $slider = $sidebar.select('.slider')
const $buttons = $sidebar.selectAll('.nav__sort-button');

console.log($slider)

const REM = 16;
const MAX_YEAR = 2010;
const MIN_YEAR = 1880;
const NUM_BOOKS = $book.size();
const scaleColor = d3
  .scaleQuantize()
  .range(COLORS)
  .nice();

let miniRatio = 0;

const filters = { keyword: false, years: [+MIN_YEAR, +MAX_YEAR] };



function setSizes() {
  const pad = REM * 2;
  const ratio = 1 / 6;
  const pageH = window.innerHeight;
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

  const miniContainerH = pageH - $miniTitle.node().offsetHeight;

  const miniH = Math.max(1, Math.floor(miniContainerH / NUM_BOOKS));
  const maxBookW = d3.max(sizes, d => d.width);
  miniRatio = maxBookW / (miniGraphicW * 0.2);

  $mini.each((d, i, n) => {
    const { width } = sizes[i];
    d3.select(n[i]).style('width', `${Math.floor(width / miniRatio)}px`);
    d3.select(n[i]).style('height', `${miniH}px`);
  });
}

function applyFilters(d) {
  let onScreen = null;
  if (d.previousState === 'exit') onScreen = false
  else onScreen = true

  Object.keys(filters).forEach(k => {
    if (filters[k]) {
      onScreen = d.year >= +filters.years[0] && d.year <= +filters.years[1]
    }
  });
  if (onScreen && d.previousState === 'exit') return 'enter';
  if (!onScreen && d.previousState === 'update') return 'exit';
  if (!onScreen && d.previousState === 'exit') return 'exit';
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
    const state = applyFilters(d);
    d.previousState = state;

    const updateX = `${centerX + posX[i] / factor}px`;
    const enterX = `${-offX}px`;
    const exitX = `${offX}px`;

    if (state === 'enter') {
      $b.style('left', enterX).style('top', `${posY}px`);
    }

    const animateX = state === 'exit' ? exitX : updateX;
    const animateY = state === 'exit' ? $b.style('top') : `${posY}px`;

    $b.transition()
      .duration(500)
      .delay((posY * factor) / 10)
      .ease(d3.easeCubicInOut)
      .style('top', animateY)
      .style('left', animateX);

    if (state !== 'exit') posY += $b.node().offsetHeight;
  });

  graphic.style('height', `${posY}px`);

  const count = $book.filter(d => d.previousState === 'update' || d.previousState === 'enter')
  $miniCount.text(count.size())
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
  stackBook({ graphic: $miniCont, posX });
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
  $mini.each((d, i, n) => {
    const bigBook = $book.nodes()[i];
    const bigColor = d3.select(bigBook).style('background');
    const $m = d3.select(n[i]);
    $m.style('background', bigColor);
  });
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
    $miniSorted = $mini.sort((a, b) => {
      if (a.author && b.author) {
        const authorA = a.author[0].last;
        const authorB = b.author[0].last;
        return d3.ascending(authorA, authorB);
      }
    });
  else $miniSorted = $mini.sort((a, b) => d3.ascending(a[slug], b[slug]));

  $book = $sorted
  $mini = $miniSorted
}

function handleSort() {
  const sel = d3.select(this);
  const slug = sel.attr('data-slug');
  const $sorted = sortData(slug);

  $buttons.classed('is-active', false)
  sel.classed('is-active', true)
  //filters.keyword = !filters.keyword;
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
      $miniGraphic.classed('is-visible', true);
      console.log("entered")
    },
    exit: () => {
      $sidebar.classed('is-visible', false);
      $miniGraphic.classed('is-visible', false)
      console.log("exited")
    },
    progress: (el, progress) => {
      console.log(progress)
    },
    offset: 0.5,
    once: true,
  });
}

function handleSlide(value){
  const [start, end] = value
  filters.years = [+start, +end]
  stack()
}

function setupSlider(){
  const start = [MIN_YEAR, MAX_YEAR]
  const slider = noUiSlider.create($slider.node(), {
    start,
    step: 4,
    connect: true,
    tooltips: [
      {
        to: value => +value
      },
      {
        to: value => +value
      }
    ],
    range: {
      min: +MIN_YEAR,
      max: +MAX_YEAR
    }
  })

  slider.on('change', handleSlide);
}

function setupUI() {
  setupSort();
  setupUIEnter();
  setupSlider()
}

function colorBg(d) {
  d3.select(this).style('background-color', scaleColor(d.year));
}

function colorize() {
  const yearRange = [MIN_YEAR, MAX_YEAR];
  scaleColor.domain(yearRange);
  // console.log(COLORS.length);
  // console.log(scaleColor.thresholds());
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
