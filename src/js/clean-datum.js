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

export default cleanDatum;
