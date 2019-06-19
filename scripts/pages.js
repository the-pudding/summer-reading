const fs = require('fs');
const mkdirp = require('mkdirp');
const request = require('request');

const data = JSON.parse(fs.readFileSync('./src/assets/data/books.json'));

async function downloadPage(d) {
  const path = `./.tmp/pages/${d.BibNum}.html`;
  const exists = fs.existsSync(path);
  if (!exists && d.WorldCatLink) {
    request(d.WorldCatLink, (err, resp, body) => {
      console.log(d.WorldCatLink);
      // console.log(err, resp, body);
      if (err || resp.statusCode !== 200 || !body) return Promise.reject();

      fs.writeFileSync(path, body);
      return Promise.resolve();
    });
  } else return Promise.resolve();
}

async function munge(d) {
  return new Promise((resolve, reject) => {
    jimp
      .read(`./.tmp/pages/${d}`)
      .then(img =>
        img
          .resize(280, jimp.AUTO)
          .quality(75)
          .color([{ apply: 'desaturate', params: [50] }])
          .write(`./.tmp/pages-munge/${d}`)
      )
      .then(resolve)
      .catch(() => reject(d));
  });
}

async function download() {
  mkdirp('./.tmp/pages');
  for (d of data) {
    try {
      await downloadPage(d);
    } catch (error) {
      console.log(error);
    }
  }
  return Promise.resolve();
}

async function parse() {
  mkdirp('./.tmp/pages-munge');
  const data = fs.readdirSync('./.tmp/pages').filter(d => d.includes('.jpg'));

  for (d of data) {
    try {
      await munge(d);
    } catch (error) {
      console.log(error);
    }
  }
}

// choose which function to run
download();
// parse();
