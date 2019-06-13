import FontFaceObserver from 'fontfaceobserver';
import { addClass } from './dom';

const htmlEl = document.documentElement;
const TIMEOUT = 3000;

function addFont(family) {
  const first = family.split(' ')[0];
  const name = first.toLowerCase().replace(/ /g, '-');
  const className = `loaded-${name}`;
  addClass(htmlEl, className);
  return Promise.resolve();
}

function loadFont(font) {
  return new Promise((resolve, reject) => {
    const { family, weight = 'normal' } = font;
    const fontObserver = new FontFaceObserver(family, { weight });
    fontObserver
      .load(null, TIMEOUT)
      .then(() => addFont(family))
      .then(resolve)
      .catch(reject);
  });
}

export default loadFont;
