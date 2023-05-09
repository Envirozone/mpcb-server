const axios = require("axios");
const format = require("date-format");

function genRand(min, max, decimalPlaces) {
  var rand = Math.random() * (max - min) + min;
  var power = Math.pow(10, decimalPlaces);
  return Math.floor(rand * power) / power;
}

const setDataTOJharkhand = function () {
  const val = genRand(39, 40, 2);
  axios({
    method: "GET",
    url: `http://jsac.jharkhand.gov.in/Pollution/WebService.asmx/GET_PM_DATA?vender_id=21&industry_id=SKID_429&stationId=Ambient_1&analyserId=QESPM10&processValue=${val}&scaledValue=${val}&flag=U&timestamp=${format(
      "yyyy-MM-dd hh:mm:ss",
      new Date()
    )}&unit=mg/nm3&parameter=PM10`,
  })
    .then((res) => {
      console.log(res.data);
    })
    .catch((error) => {
      console.log(error.message);
    });
};
setInterval(() => {
  setDataTOJharkhand();
}, 1000 * 60 * 30);
