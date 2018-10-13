const cheerio = require('cheerio');
const request = require('request-promise');
const Json2csvParser = require('json2csv').Parser;
const fs = require('fs');

const baseUrl = 'https://www.archstl.org/parish-directory/p/';


const getPage = (url) => {
  return new Promise((resolve, reject) => {
    request(url).then((response) => {
      const $ = cheerio.load(response);
      const rowText = $('.school-list-item.w-100 > .row.no-gutters').map((i, element) => {
        const title = $(element).find('h4').text().trim();
        const link = $(element).find('h4 a').attr('href').trim();
        const phone = $(element).find('.fa-ul a').text().trim();
        const address = $(element).find('.card-text a').eq(0).text().trim() + ', ' + $(element).find('.card-text a').eq(1).text().trim();
        return {
          title,
          link,
          phone,
          address
        }
      }).toArray();
      // console.log('aaaaa:');
      // console.log(rowText);
      // console.log('------');
      resolve(rowText);
    }, (err) => {
      console.error('error', err);
      reject(err);
    });
    
  });
}



let promises = [];
for(let i = 1; i <= 10; i++) {
  const pageUrl = `${baseUrl}${i}`;
  promises.push(getPage(pageUrl));
}
Promise.all(promises).then((allParishesArrays) => {
  const allParishes = [].concat.apply([], allParishesArrays);
  console.log('allParishes', allParishes);

  const fields = ['title', 'link', 'phone', 'address'];
  const json2csvParser = new Json2csvParser({ fields });
  const csv = json2csvParser.parse(allParishes);

  fs.writeFile('../data/Points.csv', csv, 'utf8', function (err) {
    if (err) {
      console.log('Some error occured - file either not saved or corrupted file saved.');
    } else{
      console.log('It\'s saved!');
    }
  });
}, (err) => {
  console.log('error:', err);
});