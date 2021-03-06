const fs = require('fs');
const downloader = require('image-downloader');
const mkdirp = require('mkdirp');
const jimp = require('jimp');

const data = JSON.parse(fs.readFileSync('./src/assets/data/books.json'));

async function downloadImage(d) {
  const path = `./.tmp/books/${d.BibNum}.jpg`;
  const exists = fs.existsSync(path);
  if (!exists && d.ImageUrl) {
    console.log(d.BibNum);
    // const options = {
    //   url: d.ImageUrl,
    //   dest: path,
    // };
    // try {
    //   const { filename, image } = await downloader.image(options);
    //   console.log(filename);
    //   return Promise.resolve();
    // } catch (e) {
    //   return Promise.reject(e);
    // }
  } else return Promise.resolve();
}

async function munge(d) {
  return new Promise((resolve, reject) => {
    jimp
      .read(`./.tmp/books/${d}`)
      .then(img =>
        img
          .resize(280, jimp.AUTO)
          .quality(75)
          .color([{ apply: 'desaturate', params: [50] }])
          .write(`./.tmp/books-munge/${d}`)
      )
      .then(resolve)
      .catch(() => reject(d));
  });
}

async function download() {
  // mkdirp('./.tmp/books');
  for (d of data) {
    try {
      await downloadImage(d);
    } catch (error) {
      console.log(error);
    }
  }
  return Promise.resolve();
}

async function convert() {
  mkdirp('./.tmp/books-munge');
  const data = fs.readdirSync('./.tmp/books').filter(d => d.includes('.jpg'));

  for (d of data) {
    try {
      await munge(d);
    } catch (error) {
      console.log(error);
    }
  }
}

// choose which function to run
// download();
convert();
