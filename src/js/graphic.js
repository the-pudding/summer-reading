/* global d3 window.requestAnimationFrame window.innerHeight */
import Fitty from 'fitty';
import EnterView from 'enter-view';
import MoveTo from 'moveto';
import noUiSlider from 'nouislider';
import COLORS from './colors';
import loadData from './load-data';
import loadImage from './utils/load-image-promise';

const $html = d3.select('html');
const $main = d3.select('main');
const $graphic = d3.select('#graphic');
const $sidebar = d3.select('#sidebar');
const $toggleCont = $sidebar.select('.sidebar__drawer');
const $toggle = $sidebar.select('.drawer__toggle');
const $mini = d3.select('#minimap');
const $miniGraphic = $mini.select('.minimap__graphic');
const $miniTitle = $mini.select('.minimap__hed');
const $miniCount = $miniTitle.select('span');
const $slider = $sidebar.select('.slider');
const $sortButton = $sidebar.selectAll('.nav__sort-button');
const $filterButton = $sidebar.selectAll('.nav__filter-button');
const $sortDesc = $sidebar.selectAll('.sort__desc');
const $filterDesc = $sidebar.selectAll('.filter__desc');
const $tooltip = d3.select('#tooltip');
const $locator = $miniGraphic.select('.graphic__locator');
const $graphicEl = $graphic.node();
const $graphicScale = $graphic.select('.graphic__scale');
const $headerToggle = d3.select('.header__toggle');
const $starCont = $tooltip.select('.stars');

let $book = null;
let $bookM = null;

const MAX_BOOK_WIDTH = 560;
const MIN_BOOK_WIDTH = 320;
const MAX_YEAR = 2010;
const MIN_YEAR = 1880;
const FONTS = ['vast', 'righteous', 'unica', 'abril', 'quintessential'];
const EV_BREAKPOINT = 960;
const FLOURISH_WIDTH = 100; // for both flourishes
const FLOURISH_LOGOS = [
  'moustache',
  'bicycle',
  'deer',
  'glasses',
  'mug',
  'camera',
  'pencil',
  'pipe',
  'watch',
  'cup',
];

const scaleColor = d3
  .scaleQuantize()
  .range(COLORS)
  .nice();

const filters = { years: [MIN_YEAR, MAX_YEAR - 5] };

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
let maxBookH = 0;
let sidebarW = 0;
let obscureScale = null;
let miniH = 0;
let mobile = false;

function generateRandomFont(title) {
  const len = title.length;
  const possible = len < 20 ? FONTS : FONTS.filter(d => d !== 'vast');
  return possible[Math.floor(Math.random() * possible.length)];
}

function generateRandomLogo() {
  return FLOURISH_LOGOS[Math.floor(Math.random() * FLOURISH_LOGOS.length)];
}

function setSizes() {
  // const pad = REM * 4;
  const ratio = 1 / 6;
  const pageH = window.innerHeight;
  const miniGraphicW = $miniGraphic.node().offsetWidth;
  let baseW = Math.min(
    MAX_BOOK_WIDTH,
    windowW - (mobile ? 0 : (sidebarW + miniGraphicW) * 2)
  );

  baseW *= 0.67;
  if (!mobile) baseW = Math.max(baseW, MIN_BOOK_WIDTH);

  const baseH = baseW * ratio;
  const sizes = d3.range(numBooks).map(() => {
    const w = Math.floor(
      baseW + Math.random() * baseW * (mobile ? 0.125 : 0.25)
    );
    const h = Math.floor(baseH + Math.random() * baseH * (mobile ? 0.4 : 0.35));
    return { width: w, height: h };
  });

  $book.each((d, i, n) => {
    const { width, height } = sizes[i];
    const $thisBook = d3.select(n[i]);
    $thisBook.style('width', `${width}px`);
    $thisBook.style('height', `${height}px`);
    // set width of title to be total width - flourishes
    $thisBook
      .select('.book__title-container')
      .style('width', `${width - FLOURISH_WIDTH}px`);
  });

  const miniContainerH = pageH - $miniTitle.node().offsetHeight;

  miniH = Math.max(1, Math.floor(miniContainerH / numBooks));
  maxBookW = d3.max(sizes, d => d.width);
  maxBookH = d3.max(sizes, d => d.height);
  miniRatio = maxBookW / (miniGraphicW * 0.2);

  $bookM.each((d, i, n) => {
    const { width } = sizes[i];
    d3.select(n[i]).style('width', `${Math.floor(width / miniRatio)}px`);
    d3.select(n[i]).style('height', `${miniH}px`);
  });
}

function applyFilters(d) {
  let off = false;

  // look for things to satisfy offscreen conditions
  Object.keys(filters)
    .filter(f => filters[f])
    .forEach(f => {
      const filter = filters[f];
      if ((f === 'years' && d.PubYear < +filter[0]) || d.PubYear > +filter[1])
        off = true;
      if (f === 'hipster' && d.GoodreadsReviews >= obscureScale[1]) off = true;
      if (f === 'short' && d.Pages >= 200) off = true;
      if (f === 'long' && d.Pages <= 400) off = true;
      if (f === 'unrated' && d.GoodreadsRating > 0) off = true;
      // if (f === 'unknown' && d.Subjects != '' && d.Summary != '' || d.GoodreadsRating > 0 ) off = true;
      if (f === 'pnw' && !d.Filters.includes('pnw')) off = true;
    });

  return !off;
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
      d.wasEnter = d3.select(n[i]).attr('data-enter') === 'true';
    });

    sel.style('left', (d, i, n) => {
      const $b = d3.select(n[i]);
      const isEnter = $b.attr('data-enter') === 'true';
      return isEnter ? `${-offX}px` : $b.style('left');
    });

    sel
      .attr('data-enter', 'false')
      .attr('data-y', (d, i) => posY[i])
      .attr('data-i', (d, i) => i)
      .transition()
      .duration(duration)
      .delay((d, i) => (jump ? 0 : 250 + (d.wasEnter ? count * 2 : 0) + i * 2))
      .ease(d3.easeCubicInOut)
      .style('top', (d, i) => `${posY[i]}px`)
      .style('left', (d, i) => `${centerX + posX[i] / factor}px`);

    return sel;
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

  book.data(bookData, d => d.BibNum).join(enter, update, exit);

  // if (isMini) $bookM = newSel;
  // else $book = newSel;

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
    if (match)
      return $book.filter(d => d.BibNum === match.BibNum).attr('data-y');
  } else {
    const t = typeof val;
    const match = bookData.find(d => {
      if (t === 'number') return d[currentSlug] === val;
      return d[currentSlug].toLowerCase().startsWith(val);
    });
    if (match) {
      const $f = $book.filter(d => d.BibNum === match.BibNum);
      if ($f.size()) return $f.attr('data-y');
    }
  }

  return null;
}

function updateScroll() {
  scrollTick = false;
  const { bottom, height } = $graphicEl.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, 1 - bottom / height));
  const percent = d3.format('%')(progress);
  $locator.style('top', percent);
  if (mobile) $headerToggle.classed('is-visible', window.scrollY);
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
    .style('margin-left', `${mobile ? 0 : sidebarW}px`);
}

function resizeFit() {
  const h = [];
  $book.each((d, i, n) => h.push(n[i].offsetHeight));
  const maxSize = d3.min(h) / 2;
  const minSize = mobile ? 12 : 16;
  if (fontsReady) {
    Fitty('.book__title', {
      minSize,
      maxSize,
    });
    $book
      .select('.book__title')
      .attr('class', d => {
        const font = fallbackFont
          ? ''
          : ` font-${generateRandomFont(d.TitleClean)}`;
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

function resizeFlourish() {
  const h = Math.floor(maxBookH * 0.33);
  $graphic
    .selectAll('.book__flourish')
    .style('width', `${h}px`)
    .style('height', `${h}px`);
}

function resize() {
  windowW = $main.node().offsetWidth;
  windowH = window.innerHeight;
  sidebarW = $sidebar.node().offsetWidth;
  mobile = windowW < EV_BREAKPOINT;
  setSizes();
  stack(true);
  resizeFit();
  resizeLocator();
  resizeFlourish();
  updateScroll();
  updateScale();
}

function handleMiniClick() {
  const [x, y] = d3.mouse(this);
  const index = Math.floor(y / miniH);
  const el = $graphic.select(`[data-i='${index}'][data-enter='false']`).node();
  const mt = new MoveTo();
  mt.move(el);
}

function handleSort() {
  const sel = d3.select(this);
  const slug = sel.attr('data-slug');
  const desc = sel.attr('data-desc');

  $sortDesc.text(desc);
  $sortButton.classed('is-active', false);
  sel.classed('is-active', true);

  currentSlug = slug;
  rawData.sort((a, b) => d3.ascending(a[slug], b[slug]));

  stack();
  updateScale();
}

function handleFilter() {
  const sel = d3.select(this);
  const active = sel.classed('is-active');
  const slug = sel.attr('data-slug');
  const desc = sel.attr('data-desc');

  $filterDesc.text(desc);

  $filterButton.classed('is-active', false);
  sel.classed('is-active', !active);

  Object.keys(filters).forEach(f => {
    if (f !== 'years') delete filters[f];
  });
  if (!active) filters[slug] = true;
  stack();
  updateScale();
}

function handleScroll() {
  if (!scrollTick) {
    scrollTick = true;
    window.requestAnimationFrame(updateScroll);
  }
}

function setupButtons() {
  $sortButton.on('click', handleSort);
  $filterButton.on('click', handleFilter);
}

function setupUIEnter() {
  EnterView({
    selector: '#graphic',
    enter: () => {
      if (!mobile) {
        $sidebar.classed('is-visible', true);
        $toggle.classed('is-visible', true);
      }
      $toggleCont.classed('is-visible', true);
      $mini.classed('is-visible', true);
    },
    exit: () => {
      $sidebar.classed('is-visible', false);
      $mini.classed('is-visible', false);
      $toggle.classed('is-visible', false);
      $toggleCont.classed('is-visible', false);
    },
    offset: 0.67,
  });

  EnterView({
    selector: '#outro',
    enter: () => {
      $sidebar.classed('is-visible', false);
      $mini.classed('is-visible', false);
      $toggle.classed('is-visible', false);
      $toggleCont.classed('is-visible', false);
    },
    exit: () => {
      if (!mobile) {
        $sidebar.classed('is-visible', true);
        $toggle.classed('is-visible', true);
      }
      $mini.classed('is-visible', true);
      $toggleCont.classed('is-visible', true);
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

function setupMiniClick() {
  $miniGraphic.on('click', handleMiniClick);
}

function setupUI() {
  setupButtons();
  setupSlider();
  setupUIEnter();
  setupMiniClick();
}

function fillStars(rating) {
  $starCont
    .selectAll('.star')
    .classed('full', false)
    .classed('half', false);

  const wholeStars = Math.floor(rating);
  const halfStars = wholeStars < rating;

  for (let iStar = 1; iStar <= wholeStars; iStar++) {
    d3.select(`.star-${iStar}`).classed('full', true);
  }

  if (halfStars) {
    d3.select(`.star-${wholeStars + 1}`).classed('half', true);
  }
}

function openTooltip(d) {
  $tooltip.classed('is-active', true);

  const src = `assets/images/books/${d.BibNum}.jpg`;
  const $img = $tooltip.select('img');

  $img.style('opacity', 0).attr('src', d.HasImage ? src : '');

  const shortenedTitle =
    d.TitleClean.length > 15
      ? `${d.TitleClean.substring(0, 15)}...`
      : d.TitleClean;

  $tooltip.select('.tooltip__meta-year').text(`[${d.PubYear}]`);
  $tooltip.select('.tooltip__meta-title').text(shortenedTitle);
  $tooltip
    .select('.tooltip__meta-author')
    .text(d.AuthorClean[0].first.concat(` ${d.AuthorClean[0].last}`));
  $tooltip.select('.tooltip__meta-desc').text(d.GoodreadsDes);
  $tooltip
    .select('.tooltip__library')
    .attr('href', `${d.WorldCatLink}#borrow`)
    .classed('is-visible', !!d.WorldCatLink);
  const $goodreadsAttr = $tooltip.select('.goodreads-attr');
  $goodreadsAttr
    .attr('href', d.GoodreadsLink)
    .classed('is-visible', !!d.GoodreadsLink);
  fillStars(d.GoodreadsRating);

  if (d.GoodreadsRating === 0 && d.GoodreadsLink) {
    $goodreadsAttr.text('No ratings on Goodreads');
    $starCont.classed('is-hidden', true);
  } else if (!d.GoodreadsLink) {
    $goodreadsAttr
      .text('Not on Goodreads')
      .attr('href', 'https://goodreads.com');

    $starCont.classed('is-hidden', true);
  } else {
    $goodreadsAttr.text('on Goodreads');
    $starCont.classed('is-hidden', false);
  }

  if (d.HasImage) {
    loadImage(src).then(() => {
      $img
        .transition()
        .duration(250)
        .style('opacity', 1);
    });
  }
}

function closeTooltip() {
  const sel = d3.select(d3.event.target);
  const isLibrary = sel.classed('tooltip__library');
  const isGoodreads = sel.classed('goodreads-attr');
  if (!isLibrary && !isGoodreads) $tooltip.classed('is-active', false);
}

function designFlourishes() {
  $book.each((d, i, n) => {
    const sel = d3.select(n[i]);
    if (d.Flourish <= 0.2) {
      const logo = generateRandomLogo();
      sel
        .select('.book__flourish-0')
        .style('background-image', `url('assets/images/${logo}.png')`)
        .classed('is-visible', true);
    } else if (d.Flourish <= 0.4) {
      const logo = generateRandomLogo();
      sel
        .select('.book__flourish-1')
        .style('background-image', `url('assets/images/${logo}.png')`)
        .classed('is-visible', true);
    } else if (d.Flourish <= 0.7) {
      const width = Math.ceil(Math.random() * 3);
      const styles = ['solid', 'double', 'dashed'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const col = d3.color(scaleColor(d.PubYear));
      const bg = col.darker(0.5).hex();
      const factor = randomStyle === 'double' ? 2 : 1;
      sel
        .select('.book__title-container')
        .style('border-left', `${factor * width}px ${randomStyle} ${bg}`)
        .style('border-right', `${factor * width}px ${randomStyle} ${bg}`);
    }
  });
}

function setupFigures() {
  const yearRange = [MIN_YEAR, MAX_YEAR];
  scaleColor.domain(yearRange);
  numBooks = bookData.length;
  bookData.sort((a, b) => d3.ascending(a.TitleClean, b.TitleClean));

  $book = $graphic
    .selectAll('.book')
    .data(bookData, d => d.BibNum)
    .join('div')
    .attr('class', 'book')
    .style('background-color', d => scaleColor(d.PubYear));

  $bookM = $miniGraphic
    .selectAll('.book')
    .data(bookData, d => d.BibNum)
    .join('div')
    .attr('class', 'book book--mini')
    .style('background-color', d => scaleColor(d.PubYear));

  const $titleContainer = $book
    .append('div')
    .attr('class', 'book__title-container');

  $titleContainer
    .append('h4')
    .attr('class', 'book__title')
    .text(d => d.TitleClean);

  $book
    .selectAll('.book__flourish')
    .data(d3.range(0, 2))
    .join('div')
    .attr('class', (d, i) => `book__flourish book__flourish-${i}`);

  $book.each((d, i, n) => {
    if (d.Flourish === 1)
      d3.select(n[i])
        .selectAll('.book__flourish')
        .remove();
  });

  designFlourishes();

  $book.on('click', openTooltip);
  $tooltip.on('click', closeTooltip);
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

function setupStars() {
  const $stars = $starCont
    .selectAll('.star')
    .data(d3.range(1, 6))
    .join('div')
    .attr('class', (d, i) => `star star-${d}`);
}

function setupFirstSlug() {
  const $f = $sortButton.filter((d, i, n) =>
    d3.select(n[i]).classed('is-active')
  );
  currentSlug = $f.attr('data-slug');
  const desc = $f.attr('data-desc');
  $sortDesc.text(desc);
}

function setupObscure() {
  const data = bookData.map(d => d.GoodreadsReviews).filter(d => d > 0);
  data.sort(d3.ascending);
  // const max = d3.max(data);
  // const median = d3.median(data);
  const q1 = d3.quantile(data, 0.25);
  const q2 = d3.quantile(data, 0.75);

  // TODO quantiles?
  obscureScale = [0, q1, q2];
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
    setupStars();
    resize();
    setupUI();
    setupComplete = true;
  });
}

export default { init, resize };
