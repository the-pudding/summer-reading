/* global d3 window.requestAnimationFrame window.innerHeight */
import Fitty from 'fitty';
import EnterView from 'enter-view';
import noUiSlider from 'nouislider';
import COLORS from './colors';
import loadData from './load-data';

const $html = d3.select('html');
const $main = d3.select('main');
const $graphic = d3.select('#graphic');
const $sidebar = d3.select('#sidebar');
const $toggle = $sidebar.select('.drawer__toggle');
const $mini = d3.select('#minimap');
const $miniGraphic = $mini.select('.minimap__graphic');
const $miniTitle = $mini.select('.minimap__hed');
const $miniCount = $miniTitle.select('span');
const $slider = $sidebar.select('.slider');
const $sortButton = $sidebar.selectAll('.nav__sort-button');
const $tooltip = d3.select('#tooltip');
const $tooltipClose = $tooltip.select('.tooltip__close');
const $locator = $miniGraphic.select('.graphic__locator');
const $graphicEl = $graphic.node();
const $graphicScale = $graphic.select('.graphic__scale');

let $book = null;
let $bookM = null;

const REM = 16;
const MAX_YEAR = 2010;
const MIN_YEAR = 1880;
const FONTS = ['vast', 'righteous', 'unica', 'abril', 'quintessential'];
const EV_BREAKPOINT = 900;

const scaleColor = d3
  .scaleQuantize()
  .range(COLORS)
  .nice();

const filters = { keyword: false, years: [MIN_YEAR, MAX_YEAR - 5] };

let bookData = [];
let rawData = [];
let miniRatio = 0;
let numBooks = 0;
let fontsReady = false;
let fallbackFont = false;
let setupComplete = false;
let fontCheckCount = 0;
let scrollTick = false;
let windowW = $main.node().offsetWidth;
let windowH = window.innerHeight;
let currentSlug = null;
let maxBookW = 0;
let sidebarW = 0;
let obscureScale = null;

function generateRandomFont() {
  return FONTS[Math.floor(Math.random() * FONTS.length)];
}

function setSizes() {
  const pad = REM * 2;
  const ratio = 1 / 6;
  const pageH = window.innerHeight;
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
  maxBookW = d3.max(sizes, d => d.width);
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

function stackBook({ graphic, book, posX, jump }) {
  const graphicW = graphic.node().offsetWidth;
  const centerX = graphicW / 2;
  const offX = graphicW * 1.5;

  const isMini = graphic.classed('minimap__graphic');
  const factor = isMini ? miniRatio : 1;
  const duration = jump ? 0 : 500;
  let tally = 0;

  const enter = () => {};

  const update = sel => {
    const count = sel.size();

    const posY = [];
    sel.each((d, i, n) => {
      posY.push(tally);
      tally += n[i].offsetHeight;
      d.wasEnter = !!d3.select(n[i]).attr('data-enter');
    });

    sel.style('left', (d, i, n) => {
      const $b = d3.select(n[i]);
      const isEnter = $b.attr('data-enter');
      return isEnter ? `${-offX}px` : $b.style('left');
    });

    sel
      .attr('data-enter', null)
      .attr('data-y', (d, i) => posY[i])
      .transition()
      .duration(duration)
      .delay((d, i) => (jump ? 0 : 250 + (d.wasEnter ? count * 2 : 0) + i * 2))
      .ease(d3.easeCubicInOut)
      .style('top', (d, i) => `${posY[i]}px`)
      .style('left', (d, i) => `${centerX + posX[i] / factor}px`);
  };

  const exit = sel => {
    sel
      .transition()
      .duration(duration)
      .delay((d, i) => (jump ? 0 : i * 2))
      .ease(d3.easeCubicInOut)
      .attr('data-enter', 'true')
      .style('left', `${offX}px`);
  };

  book.data(bookData, d => d.Title).join(enter, update, exit);

  graphic.style('height', `${tally}px`);

  $miniCount.text(bookData.length);
}

function stack(jump) {
  bookData = rawData.filter(applyFilters);

  const damp = 1 / numBooks;
  const scaleSin = $graphic.node().offsetWidth * 0.05;
  const scaleOff = 10;

  const posX = d3.range(numBooks).map(i => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const offset = i === 0 ? 0 : Math.random() * dir * scaleOff;
    return Math.sin(i * damp * Math.PI * 2) * scaleSin + offset;
  });

  stackBook({ graphic: $graphic, book: $book, posX, jump });
  stackBook({ graphic: $miniGraphic, book: $bookM, posX, jump });
}

function findTickPos(val, index) {
  if (currentSlug === 'GoodreadsReviews') {
    const match = bookData.find(d => d[currentSlug] >= obscureScale[index]);
    if (match) return $book.filter(d => d.Title === match.Title).attr('data-y');
  } else {
    const t = typeof val;
    const match = bookData.find(d => {
      if (t === 'number') return d[currentSlug] === val;
      return d[currentSlug].toLowerCase().startsWith(val);
    });
    if (match) return $book.filter(d => d.Title === match.Title).attr('data-y');
  }

  return null;
}

function updateScroll() {
  scrollTick = false;
  const { bottom, height } = $graphicEl.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, 1 - bottom / height));
  const percent = d3.format('%')(progress);
  $locator.style('top', percent);
}

function updateScale() {
  const alpha = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const year = d3.range(MIN_YEAR, MAX_YEAR, 10);
  const obscure = ['recherché', 'mildly esoteric', 'almost ordinary'];

  const scaleVals = {
    TitleClean: alpha,
    PubYear: year,
    GoodreadsReviews: obscure,
  };

  const values = scaleVals[currentSlug];

  const data = values
    .map((d, i) => ({
      val: d,
      top: findTickPos(d, i),
    }))
    .filter(d => d.top);

  $graphicScale
    .selectAll('.tick')
    .data(data, d => d.val)
    .join(
      enter => {
        const $tick = enter.append('div').attr('class', 'tick');

        $tick.append('p');
        return $tick;
      },
      update => update,
      exit => exit.remove()
    )
    .style('top', d => `${d.top}px`)
    .select('p')
    .text(d => d.val)
    .style('margin-left', `${sidebarW}px`);
}

function resizeFit() {
  const h = [];
  $book.each((d, i, n) => h.push(n[i].offsetHeight));
  const maxSize = d3.min(h) / 2;
  const minSize = 16;
  if (fontsReady) {
    Fitty('.book__title', {
      minSize,
      maxSize,
    });
    $book
      .select('.book__title')
      .attr('class', () => {
        const font = fallbackFont ? '' : ` font-${generateRandomFont()}`;
        return `book__title${font}`;
      })
      .classed('is-visible', true);
  }
}

function resizeLocator() {
  const gH = $graphic.node().offsetHeight;
  const percent = d3.format('%')(windowH / gH);
  $locator.style('height', percent);
}

function resize() {
  windowW = $main.node().offsetWidth;
  windowH = window.innerHeight;
  sidebarW = $sidebar.node().offsetWidth;
  setSizes();
  stack(true);
  resizeFit();
  resizeLocator();
  updateScroll();
  updateScale();
}

function sortData(slug) {
  currentSlug = slug;
  rawData.sort((a, b) => d3.ascending(a[slug], b[slug]));
}

function handleSort() {
  const sel = d3.select(this);
  const slug = sel.attr('data-slug');
  sortData(slug);

  $sortButton.classed('is-active', false);
  sel.classed('is-active', true);

  stack();
  updateScale();
}

function handleScroll() {
  if (!scrollTick) {
    scrollTick = true;
    window.requestAnimationFrame(updateScroll);
  }
}

function setupSort() {
  $sortButton.on('click', handleSort);
}

function setupUIEnter() {
  EnterView({
    selector: '#graphic',
    enter: () => {
      if (windowW >= EV_BREAKPOINT) {
        $sidebar.classed('is-visible', true);
        $toggle.classed('is-visible', true);
      }
      $mini.classed('is-visible', true);
    },
    exit: () => {
      $sidebar.classed('is-visible', false);
      $mini.classed('is-visible', false);
      $toggle.classed('is-visible', false);
    },
    offset: 0.67,
  });

  EnterView({
    selector: '#outro',
    enter: () => {
      $sidebar.classed('is-visible', false);
      $mini.classed('is-visible', false);
      $toggle.classed('is-visible', false);
    },
    exit: () => {
      if (windowW >= EV_BREAKPOINT) {
        $sidebar.classed('is-visible', true);
        $toggle.classed('is-visible', true);
      }
      $mini.classed('is-visible', true);
    },
    offset: 0,
  });
}

function handleSlide(value) {
  const [start, end] = value;
  filters.years = [+start, +end];
  stack();
  updateScale();
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

function openTooltip(d) {
  $tooltip.classed('is-active', true);

  const img = $tooltip.selectAll('img').attr('src', d.ImageUrl);
  $tooltip.select('.tooltip__meta-title').text(d.TitleClean);
  $tooltip
    .select('.tooltip__meta-author')
    .text(d.AuthorClean[0].first.concat(` ${d.AuthorClean[0].last}`));
  $tooltip.select('.tooltip__meta-desc').text(d.GoodreadsDes);
  $tooltip.select('.tooltip__gr').attr('href', d.GoodreadsLink);
}

function closeTooltip() {
  $tooltip.classed('is-active', false);
}

function setupFigures() {
  const yearRange = [MIN_YEAR, MAX_YEAR];
  scaleColor.domain(yearRange);
  numBooks = bookData.length;
  bookData.sort((a, b) => d3.ascending(a.TitleClean, b.TitleClean));

  $book = $graphic
    .selectAll('.book')
    .data(bookData, d => d.Title)
    .join('div')
    .attr('class', 'book')
    .style('background-color', d => scaleColor(d.PubYear));

  $bookM = $miniGraphic
    .selectAll('.book')
    .data(bookData, d => {
      //  console.log(d)
      return d.Title;
    })
    .join('div')
    .attr('class', 'book book--mini')
    .style('background-color', d => scaleColor(d.PubYear));

  $book
    .append('h4')
    .attr('class', 'book__title')
    .text(d => d.TitleClean);

  $book.on('click', openTooltip);
  $tooltipClose.on('click', closeTooltip);
}

function checkFontsReady() {
  fontCheckCount += 1;
  const notReady = FONTS.find(d => !$html.classed(`loaded-${d}`));
  if (!notReady) {
    fontsReady = true;
    if (setupComplete) resizeFit();
  } else if (fontCheckCount < 50) d3.timeout(checkFontsReady, 200);
  else {
    fallbackFont = true;
    fontsReady = true;
    if (setupComplete) resizeFit();
  }
}

function setupSidebarDrawer() {
  $toggle.on('click', () => {
    const visible = $sidebar.classed('is-visible');
    $sidebar.classed('is-visible', !visible);
    $toggle.classed('is-visible', !visible);
  });
}

function setupLocator() {
  window.addEventListener('scroll', handleScroll, true);
}

function setupFirstSlug() {
  currentSlug = $sortButton
    .filter((d, i, n) => d3.select(n[i]).classed('is-active'))
    .attr('data-slug');
}

function setupObscure() {
  const data = bookData.map(d => d.GoodreadsReviews).filter(d => d > 0);
  const max = d3.max(data);
  // TODO quantiles?
  obscureScale = [0, Math.floor(max * 0.33), Math.floor(max * 0.67)];
}

function init() {
  checkFontsReady();
  loadData().then(data => {
    rawData = data;
    bookData = rawData;
    setupObscure();
    setupFirstSlug();
    setupFigures();
    setupLocator();
    setupSidebarDrawer();
    resize();
    setupUI();
    setupComplete = true;
  });
}

export default { init, resize };
