const mqtt = require("mqtt");
const crypto = require("crypto");
const axios = require("axios");
const moment = require("moment-timezone");
const JSZip = require("jszip");
const fs = require("fs");
const FormData = require("form-data");
// const { getDpBefore, getDPAfterButBefore } = require('../../../utils/apilayer/getDpServices');
const _ = require("lodash");
const schedule = require("node-schedule");
const unixTime = require("unix-timestamp");

const extractData = (arr) => {
  const collectionFoPackages = [];
  let site_holded = null;
  let package = [];
  for (let i = 0; i < arr.length; i++) {
    const site_id = arr[i].split(",")[0];

    if (site_holded === null) {
      site_holded = site_id;
      package.push(arr[i]);
    } else if (site_holded === site_id) {
      package.push(arr[i]);
    } else if (site_holded !== site_id) {
      collectionFoPackages.push(package);
      package = [];
      site_holded = site_id;
      package.push(arr[i]);
    }

    if (i === arr.length - 1) {
      collectionFoPackages.push(package);
    }
  }

  const allCollection = [];
  for (let j = 0; j < collectionFoPackages.length; j++) {
    let configObj = {};
    configObj.config = {};
    const element = collectionFoPackages[j];
    const firstStrData = element[0].split(",");

    configObj.config.siteId = firstStrData[0];
    configObj.config.encryptionKey = element[0].split("++")[1];
    configObj.config.monitoringID = firstStrData[2];
    configObj.config.sensorParamMapping = {};
    configObj.config.parametersMapping = {};
    configObj.data = [];

    for (let k = 0; k < element.length; k++) {
      const item = element[k].split("++")[0].split(",");
      configObj.config.sensorParamMapping[`D${k}`] = item[5];
      const parameterMap = {
        parameterID: item[4],
        analyserID: item[3],
        monitoringID: item[2],
        unitID: item[7],
      };
      configObj.config.parametersMapping[item[5]] = parameterMap;
      configObj.data.push(
        `${element[k].split("++")[0]},${unixTime.now().toFixed(0)},0,0`
      );
    }
    allCollection.push(configObj);
  }

  return allCollection;
};

const metadata =
  "SITE_ID,SITE_UID,MONITORING_UNIT_ID,ANALYZER_ID,PARAMETER_ID,PARAMETER_NAME,READING,UNIT_ID,DATA_QUALITY_CODE,RAW_READING,UNIX_TIMESTAMP,CALIBRATION_FLAG,MAINTENANCE_FLAG";

schedule.scheduleJob("30 18 * * *", function () {
  const devIDs = Object.keys(configuration);
  for (const devID of devIDs) {
    if (configuration[devID].totalizerTag) {
      configuration[devID].previousDayTotalizerValue = null;
    }
  }
});

const formatData = async (data, deviceConfig) => {
  let dataToBeReturned = "";
  const { siteId, parametersMapping, encryptionKey } = deviceConfig;
  data.forEach((point) => {
    let data = `${point}\n`;
    dataToBeReturned = dataToBeReturned.concat(data);
  });

  dataToBeReturned = dataToBeReturned.substring(0, dataToBeReturned.length - 1); //Removed "\n" character from the end

  let dataToBeReturnedLength = dataToBeReturned.length;

  if (dataToBeReturnedLength % 16 != 0) {
    let lengthOfPadding = 16 - (dataToBeReturnedLength % 16);

    for (let i = 0; i < lengthOfPadding + 16; i++) {
      dataToBeReturned = `${dataToBeReturned}#`;
    }
  }

  const encryptedText = encryptUsingAES(encryptionKey, null, dataToBeReturned);
  return encryptedText;
};

const encryptUsingAES = (key, iv, data, isAutoPadding) => {
  if (!iv) iv = Buffer.alloc(16);

  key = key.slice(0, 32);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key),
    Buffer.from(iv)
  );

  if (!isAutoPadding) cipher.setAutoPadding(false);

  const encryptedData = cipher.update(data, "utf-8", "base64");

  return `${encryptedData}`;
};

const sendRealTimeData = async (fileName, content, time, deviceConfig) => {
  try {
    time = parseInt(`${time}000`) - 19800000;
    const { siteId, encryptionKey } = deviceConfig;
    const authMessage = `${siteId},ver_1.0,${moment(time)
      .utc()
      .add(5.5, "h")
      .format()},${encryptionKey}`;
    const formData = new FormData();

    formData.append("file", content, { filename: fileName });

    const response = await axios({
      method: "post",
      url: "http://onlinecems.ecmpcb.in/mpcb/realtimeUpload",
      data: formData,
      headers: {
        Authorization: `Basic ${encryptUsingAES(
          encryptionKey,
          null,
          authMessage,
          true
        )}${Buffer.alloc(16).toString("base64")}`,
        siteId: siteId,
        Timestamp: moment(time).utc().add(5.5, "h").format(),
        ...formData.getHeaders(),
      },
    });
    console.log(response.data.status);
  } catch (error) {
    console.log(error.message);
  }
};

const generateZipFile = async (metadata, data, deviceConfig) => {
  try {
    const zip = new JSZip();

    const { monitoringID, siteId } = deviceConfig;
    let uploadTime = moment.tz("Asia/Calcutta").format("YYYY MM DD HH mm ss");
    uploadTime = uploadTime.split(" ").join("");

    zip.file("metadata.csv", metadata);
    zip.file(`${siteId}_${monitoringID}_${uploadTime}.csv`, data);
    zip.name = `${siteId}_${monitoringID}_${uploadTime}.zip`;

    const content = await zip.generateAsync({ type: "nodebuffer" });
    return { content, fileName: zip.name };
  } catch (error) {
    return Promise.reject(error);
  }
};

const zipData = async (data, deviceConfig, time) => {
  try {
    let encryptedData = formatData(data, deviceConfig);
    const { content, fileName } = await generateZipFile(
      metadata,
      encryptedData,
      deviceConfig
    );
    await sendRealTimeData(fileName, content, time, deviceConfig);
    // }
  } catch (error) {
    return Promise.reject(error);
  }
};

const fetchData = async () => {
//   const staticData = [
//     "site_1679,site_1679,ETP,analyzer_225,parameter_83,COD,11.20,unit_15,U,0++c2l0ZV8xNjc5LHZlcl8xLjAsZGVmYXVsdCwyMDIxLTEyLTEwLTE3OjE3OjIx####",
//     "site_1679,site_1679,ETP,analyzer_225,parameter_84,BOD,4.50,unit_15,U,0++c2l0ZV8xNjc5LHZlcl8xLjAsZGVmYXVsdCwyMDIxLTEyLTEwLTE3OjE3OjIx####",
//     "site_1679,site_1679,ETP,analyzer_225,parameter_85,TSS,7.61,unit_15,U,0++c2l0ZV8xNjc5LHZlcl8xLjAsZGVmYXVsdCwyMDIxLTEyLTEwLTE3OjE3OjIx####",
//   ];
  const url = "http://3.136.233.109:5000/data";

  axios(url)
    .then((res) => {
      const data = res.data;
      const dataToBeSend = extractData(data);
      for (let i = 0; i < dataToBeSend.length; i++) {
        const element = dataToBeSend[i];
        zipData(element.data, element.config, moment().unix() + 19800);
      }
    })
    .catch((error) => {
      console.log(error.message);
    });
};
fetchData();
// setInterval(fetchData, 1000 * 60);
