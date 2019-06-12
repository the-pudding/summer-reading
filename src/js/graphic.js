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

const bookFonts = ['Vast Shadow', 'Righteous', 'Unica One']

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

function stackBook({ graphic, book, posX }) {
  const graphicW = graphic.node().offsetWidth;
  const centerX = graphicW / 2;
  const offX = graphicW * 1.5;

	const isMini = graphic.classed('minimap__graphic');
	const factor = isMini ? miniRatio : 1;
	let tally = 0;

  const enter = () => {};


  const update = sel => {

		const posY = [];
		sel.each((d, i, n) => {
			posY.push(tally);
			tally += n[i].offsetHeight;
		});

		sel.style('left', (d, i, n) => {
			const $b = d3.select(n[i]);
			const isEnter = $b.attr('data-enter');
			return isEnter ? `${-offX}px` : $b.style('left');
		});

    sel
			.attr('data-enter', null)
			.transition()
      .duration(500)
      .delay((d, i) => (i * factor) / 10)
      .ease(d3.easeCubicInOut)
      .style('top', (d, i) => `${posY[i]}px`)
			.style('left', (d, i) => `${centerX + posX[i] / factor}px`);


	};

  const exit = sel => {
		sel.transition()
			.duration(500)
			.delay((d, i) => (i * factor) / 10)
			.ease(d3.easeCubicInOut)
			.attr('data-enter', 'true')
			.style('left', `${offX}px`);
  };

	// console.log(bookData.length);

  book
    .data(bookData, d => d.Title)
    .join(enter, update, exit);

  // });

  graphic.style('height', `${tally}px`);

  $miniCount.text(bookData.length);
}

function stack() {
	bookData = rawData.filter(applyFilters);

  const damp = 1 / numBooks;
  const scaleSin = $graphic.node().offsetWidth * 0.05;
  const scaleOff = 10;

  const posX = d3.range(numBooks).map(i => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const offset = i === 0 ? 0 : Math.random() * dir * scaleOff;
    return Math.sin(i * damp * Math.PI * 2) * scaleSin + offset;
  });

  stackBook({ graphic: $graphic, book: $book, posX });
  stackBook({ graphic: $miniGraphic, book: $bookM, posX });
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

  if (slug === 'Author')
    rawData.sort((a, b) => {

      if (a.AuthorClean && b.AuthorClean) {
        const authorA = a.AuthorClean[0].last;
        const authorB = b.AuthorClean[0].last;
        return d3.ascending(authorA, authorB);
      }
    });
  else rawData.sort((a, b) => d3.ascending(a[slug], b[slug]));
}

function handleSort() {
  const sel = d3.select(this);
  const slug = sel.attr('data-slug');
  sortData(slug);

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

function generateRandomFont(){
  return bookFonts[Math.floor(Math.random() * bookFonts.length)]
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
      return d.Title})
    .join('div')
    .attr('class', 'book book--mini')
    .style('background-color', d => scaleColor(d.PubYear));

  const $title = $book
    .append('h4')
    .attr('class', 'book__title')
    .text(d => d.TitleClean)
    .style('font-family', generateRandomFont)
}

function init() {
  loadData().then(data => {
		rawData = data;
		bookData = rawData;
		setupFigures();
		setupUI();
		resize();
	});
}

export default { init, resize };
