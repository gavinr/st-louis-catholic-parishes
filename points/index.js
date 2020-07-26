const cheerio = require("cheerio");
const request = require("request-promise");
const Json2csvParser = require("json2csv").Parser;
const fs = require("fs");
const GeoJSON = require("geojson");

const baseUrl = "https://www.archstl.org/parish-directory/p/";

const getPage = (url) => {
  return new Promise((resolve, reject) => {
    request(url).then(
      (response) => {
        const $ = cheerio.load(response);
        const rowText = $(".school-list-item.w-100 > .row.no-gutters")
          .map((i, element) => {
            const title = $(element).find("h4").text().trim();
            const link = $(element).find("h4 a").attr("href").trim();
            const phone = $(element).find(".fa-ul a").text().trim();
            const address =
              $(element).find(".card-text a").eq(0).text().trim() +
              ", " +
              $(element).find(".card-text a").eq(1).text().trim();
            return {
              title,
              link,
              phone,
              address,
            };
          })
          .toArray();
        // console.log('aaaaa:');
        // console.log(rowText);
        // console.log('------');
        resolve(rowText);
      },
      (err) => {
        console.error("error", err);
        reject(err);
      }
    );
  });
};

const singleParishInfo = async (parishInfo) => {
  const retParishInfo = Object.assign({}, parishInfo);
  console.log("working on: ", retParishInfo["title"]);

  return new Promise((resolve, reject) => {
    request(parishInfo.link).then(
      (response) => {
        const mapDataParts1 = response.split("var mapData = {")[1];
        if (mapDataParts1) {
          const mapDataString = mapDataParts1.split("}")[0];
          let mapData;
          if (mapDataString && mapDataString !== "") {
            mapData = JSON.parse(`{${mapDataString}}`);
            Object.assign(retParishInfo, mapData);
          }
        }

        const $ = cheerio.load(response);
        retParishInfo["founded"] = parseInt(
          $(".founded").text().trim().split("Founded: ")[1],
          10
        );

        retParishInfo["deanery"] = $(".deanery")
          .text()
          .trim()
          .split("Deanery: ")[1]
          .split(" Deanery")[0];

        retParishInfo["parishWebsite"] = $("a[title='Learn More']").attr(
          "href"
        );

        delete retParishInfo.DetailPageUrl;
        delete retParishInfo.MapPin;
        delete retParishInfo.Id;

        // CUSTOM FIXES
        if (retParishInfo["title"] === "Old St. Ferdinand Shrine") {
          retParishInfo["Latitude"] = 38.7967719;
          retParishInfo["Longitude"] = -90.3342515;
          // https://en.wikipedia.org/wiki/Old_St._Ferdinand_Shrine
          retParishInfo["founded"] = 1819;
        } else if (
          retParishInfo["title"] ===
          "St. Mary's Assumption Ukrainian Catholic Church"
        ) {
          retParishInfo["Latitude"] = 38.61847;
          retParishInfo["Longitude"] = -90.2091183;
          // https://www.stltoday.com/suburban-journals/how-we-worship-traditional-parish-at-odds-with-catholic-church/article_41ad4beb-0eb5-501e-b50d-a655ee20b5c0.html
          retParishInfo["founded"] = 1970;
        } else if (retParishInfo["title"] === "St. Raymond's Cathedral") {
          // https://www.straymond-mc.org/79
          retParishInfo["founded"] = 1912;
        }

        resolve(retParishInfo);
      },
      (err) => {
        console.error("error", err);
        reject(err);
      }
    );
  });
};

const addMoreInfo = async (allParishInfo) => {
  const returnArray = [];
  for (let i = 0; i < allParishInfo.length; i++) {
    const parishInfo = allParishInfo[i];
    const data = await singleParishInfo(parishInfo);
    returnArray.push(data);
  }

  return returnArray;
};

let promises = [];
for (let i = 1; i <= 10; i++) {
  const pageUrl = `${baseUrl}${i}`;
  promises.push(getPage(pageUrl));
}
Promise.all(promises).then(
  async (allParishesArrays) => {
    const allParishes = [].concat.apply([], allParishesArrays);

    allParishesMoreInfo = await addMoreInfo(allParishes); // allParishes.slice(0, 20)

    // console.log("allParishesMoreInfo", allParishesMoreInfo);

    const fields = [
      "title",
      "link",
      "phone",
      "address",
      "Latitude",
      "Longitude",
      "founded",
      "deanery",
      "parishWebsite",
    ];

    // CSV:
    const json2csvParser = new Json2csvParser({
      fields,
    });
    const csv = json2csvParser.parse(allParishesMoreInfo);

    fs.writeFile("../data/Points.csv", csv, "utf8", function (err) {
      if (err) {
        console.log(
          "Some error occurred - file either not saved or corrupted file saved."
        );
      } else {
        console.log("It's saved!");
      }
    });

    // GEOJSON:
    const geoJson = GeoJSON.parse(allParishesMoreInfo, {
      Point: ["Latitude", "Longitude"],
    });
    console.log("geoJson", geoJson);
    fs.writeFile(
      "../data/Points.geojson",
      JSON.stringify(geoJson),
      "utf8",
      function (err) {
        if (err) {
          console.log(
            "Some error occurred - file either not saved or corrupted file saved."
          );
        } else {
          console.log("It's saved!");
        }
      }
    );
  },
  (err) => {
    console.log("error:", err);
  }
);
