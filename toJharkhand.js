const axios = require("axios");
const format = require("date-format");

function genRand(min, max, decimalPlaces) {
  var rand = Math.random() * (max - min) + min;
  var power = Math.pow(10, decimalPlaces);
  return Math.floor(rand * power) / power;
}

const setDataTOJharkhand = function (config) {
  console.log(config);
  const {
    venderId,
    industryId,
    stationId,
    analyserId,
    parameterName,
    unit,
    val,
    timeStamp,
  } = config;
  axios({
    method: "GET",
    url: `http://jsac.jharkhand.gov.in/Pollution/WebService.asmx/GET_PM_DATA?vender_id=${venderId}&industry_id=${industryId}&stationId=${stationId}&analyserId=${analyserId}&processValue=${val}&scaledValue=${val}&flag=U&timestamp=${timeStamp}&unit=${parameterName}&parameter=${unit}`,
  })
    .then((res) => {
      console.log(res.data);
    })
    .catch((error) => {
      console.log(error.message);
    });
};

setInterval(() => {
  setDataTOJharkhand({
    venderId: 21,
    industryId: "SKID_499",
    stationId: "Ambient_1",
    analyserId: "ENE015601",
    parameterName: "PM10",
    unit: "mg/nm3",
    val: genRand(39, 40, 2),
    timeStamp: format("yyyy-MM-dd hh:mm:ss", new Date()),
  });

  // setDataTOJharkhand({
  //   venderId: 21,
  //   industryId: "SKID_429",
  //   stationId: "Ambient_1",
  //   analyserId: "QESPM10",
  //   parameterName: "PM10",
  //   unit: "mg/nm3",
  //   val: genRand(39, 40, 2),
  //   timeStamp: format("yyyy-MM-dd hh:mm:ss", new Date()),
  // });
}, 1000 * 60 * 30);
