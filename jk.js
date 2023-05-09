const axios = require("axios");

async function fetchData() {
    try {
      const res = await axios.post(`https://apigw.mysrinagar.in/api/smartwater/update`,[
        {
            location: "Sempora",
            geocoordinates: {
                coordinates: [
                    34.0393004,
                    74.8867124
                ],
                type: "Point"
            },
            waterParamDetails: [
                {
                    deviceId: "SKPID_1611",
                    params: [
                        {
                            parameter: "cod",
                            value: "58.19",
                            unit: "mg/l",
                            timestamp: 1676959553357,
                            flag: "U"
                        }
                    ],
                    diagnostics: []
                }
            ]
        }
    ]);
      console.log(res)
    } catch (error) {
      console.log(error);
    }
  }
  fetchData();