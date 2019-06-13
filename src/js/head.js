import 'promise-polyfill/src/polyfill';
import 'whatwg-fetch';
import './polyfills/startsWith';
import './polyfills/endsWith';
import './polyfills/findIndex';
import './polyfills/find';
import './polyfills/includes';

import loadFont from './utils/load-font';

const fonts = [
  { family: 'Vast Shadow', weight: 400 },
  { family: 'Righteous', weight: 400 },
  { family: 'Unica One', weight: 400 },
  { family: 'Abril Fatface', weight: 400 },
  { family: 'Quintessential', weight: 400 },
];

fonts.forEach(loadFont);
