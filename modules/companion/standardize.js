/*
 * Copyright (C) 2018 Ryan Mason - All Rights Reserved
 *
 * Permissions of this strong copyleft license are conditioned on making available complete source code of licensed works and modifications, which include larger works using a licensed work, under the same license. Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
 *
 * https://github.com/Rytiggy/Glance/blob/master/LICENSE
 * ------------------------------------------------
 *
 * You are free to modify the code but please leave the copyright in the header.
 *
 * ------------------------------------------------
 */
import * as predictions from "./predictions.js";

// this module handles standardizing return data from various APIS
export default class standardize {
  // Expected values in return array of bloodsugars
  // sgv:
  // datetime:
  // bgdelta:
  async bloodsugars(data, extraData, settings, keys, user, database) {
    settings[keys.dexcomUsername] = "";
    settings[keys.dexcomPassword] = "";
    let bgs = data;
    let rawbg = "";
    let tempBasal = "";
    let predictedBg = "";
    let loopStatus = "";
    let upbat = "";
    let sage = "";

    if (bgs && !data.error && data && bgs !== "undefined") {
      if (settings[keys.dataSource] === "nightscout") {
        bgs = data.bgs;
        // SPIKE WORK AROUND
        // this check is here for old versions of spike where the /pebble endpoint was returning mmol svg data
        if (bgs[0].sgv < 25) {
          bgs.forEach(bg => {
            bg.sgv = mgdl(bg.sgv);
          });
          bgs[0].bgdelta = mgdl(bgs[0].bgdelta);
        } // END OF SPIKE WORK AROUND

        let standardizedExtraData = standardizeExtraData(
          bgs,
          extraData,
          settings
        );
        bgs = standardizedExtraData.bgs;
        rawbg = standardizedExtraData.rawbg;
        tempBasal = standardizedExtraData.tempBasal;
        predictedBg = standardizedExtraData.predictedBg;
        loopStatus = standardizedExtraData.loopStatus;
        upbat = standardizedExtraData.upbat;
        sage = standardizedExtraData.sage;
        // add any extra data
      } else if (settings[keys.dataSource] === "xdrip") {
        // xdrip using the sgv endpoint still
        bgs = data;
        if (Array.isArray(bgs)) {
          bgs[0].datetime = bgs[0].date;
          bgs[0].bgdelta = bgs[0].sgv - bgs[1].sgv; //element.delta;
        } else {
          bgs = null;
        }
      } else if (settings[keys.dataSource] === "spike") {
        bgs = data.bgs;
      } else if (settings[keys.dataSource] === "custom") {
        bgs = data.bgs;
      } else if (settings[keys.dataSource] === "dexcom") {
        let bgsTemplate = {
          bgs: [
            {
              sgv: "120",
              bgdelta: 0,
              iob: 0,
              cob: 0,
              datetime: null,
              direction: "flat",
              currentbg: data.error ? "E" + data.error.status : "DSE",
              rawbg: "",
              tempbasal: "",
              loopstatus: ""
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            },
            {
              sgv: "120"
            }
          ]
        };
        bgs.forEach((bg, index) => {
          bgsTemplate.bgs[index].sgv = bg.Value;
          let dateTime = bg.ST.substring(
            bg.ST.lastIndexOf("(") + 1,
            bg.ST.lastIndexOf(")")
          );
          bgsTemplate.bgs[index].datetime = parseInt(dateTime);

          if (index === 0) {
            let delta = bgs[0].Value - bgs[1].Value;
            // Set values to template
            bgsTemplate.bgs[index].direction = slopeDirection(bgs[0].Trend);
            bgsTemplate.bgs[index].bgdelta = delta;
          }
        });
        bgs = bgsTemplate.bgs;
      } else if (settings.dataSource === "tomato") {
        // tomato
        bgs = data.bgs;
        if (Array.isArray(bgs)) {
          bgs[0].datetime = bgs[0].date;
          bgs[0].bgdelta = bgs[0].sgv - bgs[1].sgv; //element.delta;
        } else {
          bgs = null;
        }
      } else if (settings[keys.dataSource] === "yagi") {
        //FAB
        bgs = data.bgs;
        if (Array.isArray(bgs)) {
          //bgs[0].datetime = bgs[0].date;
          //bgs[0].bgdelta = bgs[0].sgv - bgs[1].sgv; //element.delta;
        } else {
          bgs = null;
        }
      }

      // Look for current non Predictive bg and not the last 5 predictions
      // this works because only the current bg has a delta so we can filter for it
      let nonPredictiveBg = bgs.filter(bg => bg.bgdelta)[0];

      let hasFoundFirstDelta = false;
      bgs.forEach(bg => {
        if (bg.bgdelta != null && !hasFoundFirstDelta) {
          nonPredictiveBg = bg;
          hasFoundFirstDelta = true;
        }
      });
      // Look at the data that we are getting and if the SGV is below 25 we know the unit type is mmol
      if (nonPredictiveBg.sgv < 25) {
        bgs.forEach(bg => {
          bg.sgv = mgdl(bg.sgv);
        });
        nonPredictiveBg.bgdelta = mgdl(nonPredictiveBg.bgdelta);
      }

      let currentBG = nonPredictiveBg.sgv;

      // Convert any values to desired units type
      if (settings.glucoseUnits === "mmol") {
        currentBG = mmol(currentBG);
        rawbg = mmol(rawbg);
        nonPredictiveBg.bgdelta = mmol(nonPredictiveBg.bgdelta);
      }

      checkTimeBetweenGraphPoints(bgs, nonPredictiveBg);

      // remove any keys/values that we dont use from responce
      let propsToRemove = [
        "date",
        "delta",
        "dateString",
        "dateString",
        "units_hint",
        "type",
        "rssi",
        "sysTime",
        "device",
        "_id",
        "direction",
        "bwpo",
        "noise",
        "trend",
        "filtered",
        "unfiltered",
        "battery",
        "bwp"
      ];
      let cleanedBgs = bgs.map(tempBgs => {
        let temp = Object.keys(tempBgs).reduce((object, key) => {
          if (!propsToRemove.includes(key)) {
            object[key] = tempBgs[key];
          }
          return object;
        }, {});
        return temp;
      });

      // The only BG that will have a bgdelta will be the current one
      // Add other important info to current bg in sgv array
      cleanedBgs.map(bg => {
        if (bg.bgdelta != null) {
          // any values put here will be able to be entered in the layout
          bg.sgv = bg.sgv;
          if (bg.iob) {
            bg.iob = Math.round((Number(bg.iob) + 0.00001) * 100) / 100; //parseInt(bg.iob, 10).toFixed(1);
          } else {
            bg.iob = 0;
          }
          if (bg.cob) {
            bg.cob = Math.round((Number(bg.cob, 10) + 0.00001) * 100) / 100;
          } else {
            bg.cob = 0;
          }
          bg.datetime = nonPredictiveBg.datetime;
          bg.direction = nonPredictiveBg.direction;
          bg.rawbg = rawbg && rawbg !== "0.0" ? rawbg + " raw" : "";
          bg.tempbasal = tempBasal;
          bg.currentbg = currentBG;
          bg.predictedbg = predictedBg;
          bg.loopstatus = checkLoopStatus(loopStatus);
          bg.upbat = upbat;
          bg.sage = sage ? "SA:" + sage : "";
          if (nonPredictiveBg.direction === "NOT COMPUTABLE") {
            bg.direction = "none";
          }
          return bg;
        }
        return bg;
      });

      let returnBloodsugars = {
        currentBg: getfistBgNonPredictiveBG(cleanedBgs),
        bgs: cleanedBgs.map(bg => bg.sgv),
        predicted: cleanedBgs.filter(bg => bg.p).map(bg => bg.sgv)
      };

      // if small graph predictions is disabled remove them from the blood sugars array
      if (!settings.enableSmallGraphPrediction) {
        returnBloodsugars.bgs = returnBloodsugars.bgs.splice(
          returnBloodsugars.predicted.length,
          returnBloodsugars.bgs.length
        );
        returnBloodsugars.predicted = [];
      }

      // Allow Glance to make local treatments
      if (settings.localTreatments) {
        if (await database.isLoggedIn()) {
          let treatments = await database.getTotalTreatments();
          returnBloodsugars.currentBg.iob = treatments[user].iob;
          returnBloodsugars.currentBg.cob = treatments[user].cob;
        } else {
          let treatments = predictions.getTotalTreatments();
          returnBloodsugars.currentBg.iob = treatments[user].iob;
          returnBloodsugars.currentBg.cob = treatments[user].cob;
        }

        //   // Duration of Insulin Activity
        //   let durationOfInsulin = 3;
        //   // Carbs activity / absorption rate: [g/hour]
        //   let carbsPerHour = 20;
        //   // Insulin to carb ratio (I:C) [g]:(1/X)
        //   let insulinToCarb = 10;
        //   let predictedValues = [
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100,
        //     100
        //   ];
        //   bgs.splice(bgs.length - 18, 18);
        //   predictedValues.forEach((predictedbg, index) => {
        //     if (!(index > 17)) {
        //       bgs.unshift({
        //         sgv: "" + predictedbg,
        //         p: true
        //       });
        //     }
        //   });
      }

      return returnBloodsugars;
    }
    let currentTime = new Date();
    if (typeof data == "undefined") {
      data = {
        error: {
          status: "DSE"
        }
      };
    }
    return {
      currentBg: {
        sgv: "120",
        bgdelta: 0,
        iob: 0,
        cob: 0,
        datetime: currentTime.getTime(),
        direction: "warning",
        currentbg: data.error ? "E" + data.error.status : "DSE",
        rawbg: "",
        tempbasal: "",
        loopstatus: ""
      },
      bgs: [
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120",
        "120"
      ],
      predicted: []
    };
  }
  /**
   * Remove any extra settings that the watch does not need and Convert any values to desired units type
   * @param {Object} settings
   */
  settings(settings) {
    let tempSettings = {};
    let blackList = [
      "USAVSInternational",
      "USAVSInternationalTwo",
      "dexcomPassword",
      "dexcomPasswordTwo",
      "dexcomUsername",
      "dexcomUsernameTwo",
      "dropboxToken",
      "dropboxTokenTwo",
      "extraDataUrl",
      "extraDataUrlTwo",
      "url",
      "urlTwo",
      "yagiPatientName",
      "yagiPatientNameTwo"
    ];
    Object.keys(settings).forEach(key => {
      if (!blackList.includes(key)) {
        tempSettings[key] = settings[key];
      }
    });
    // Convert any values to desired units type
    if (tempSettings.glucoseUnits === "mmol") {
      tempSettings.highThreshold = mgdl(tempSettings.highThreshold);
      tempSettings.lowThreshold = mgdl(tempSettings.lowThreshold);
    }
    return tempSettings;
  }
}

//helper functions
// converts a mg/dL to mmoL
function mmol(bg, roundToHundredths) {
  return (Math.round((bg / 18) * 10) / 10).toFixed(1);
}

// converts mmoL to  mg/dL
function mgdl(bg) {
  let mgdlBG = Math.round(bg * 18.018).toFixed(0);

  return mgdlBG;
}

// returns value in desired format based on users settings
function checkForMmol(bg, settings) {
  if (settings.glucoseUnits === "mmol") {
    return mmol(bg);
  } else {
    return bg;
  }
}

function mode(array) {
  if (array.length == 0) return null;
  var modeMap = {};
  var maxEl = array[0],
    maxCount = 1;
  for (var i = 0; i < array.length; i++) {
    var el = array[i];
    if (modeMap[el] == null) modeMap[el] = 1;
    else modeMap[el]++;
    if (modeMap[el] > maxCount) {
      maxEl = el;
      maxCount = modeMap[el];
    }
  }
  return maxEl;
}

function countInArray(array, what) {
  var count = 0;
  for (var i = 0; i < array.length; i++) {
    if (array[i] === what) {
      count++;
    }
  }
  return count;
}

function standardizeExtraData(bgs, extraData, settings) {
  let rawbg = "";
  let tempBasal = "";
  let predictedBg = "";
  let loopStatus = "";
  let upbat = "";
  let sage = "";
  // add prediction for nightscout
  if (extraData) {
    if (settings.enableSmallGraphPrediction) {
      if (
        extraData.ar2 &&
        extraData.ar2.forecast &&
        extraData.ar2.forecast.predicted
      ) {
        // AR2
        bgs.splice(bgs.length - 6, 6);
        // TODO could be a bug here with ar2
        let predictedValues = extraData.ar2.forecast.predicted.length - 1;
        if (extraData.ar2.forecast.predicted.length > 0) {
          let tempPredictedBG =
            extraData.ar2.forecast.predicted[predictedValues].mgdl;
          predictedBg =
            checkForMmol(tempPredictedBG, settings) +
            " in " +
            ((predictedValues * 5) / 60).toFixed(1) +
            "h";
        }

        if (predictedValues >= 24) {
          predictedValues = 24;
        }
        extraData.ar2.forecast.predicted.forEach((predictedbg, index) => {
          bgs.unshift({
            sgv: predictedbg.mgdl,
            p: true
          });
        });
      } else if (extraData.loop && extraData.loop.lastPredicted) {
        // Loop
        let predictedValues = extraData.loop.lastPredicted.values;
        let modeValue = mode(predictedValues);
        let indexOfModeValue = predictedValues.findIndex(
          pbg => pbg === modeValue
        );
        predictedBg =
          checkForMmol(modeValue, settings) +
          " in " +
          ((indexOfModeValue * 5) / 60).toFixed(1) +
          "h";
        if (extraData.loop.display) {
          loopStatus = extraData.loop.display.label;
        }

        bgs.splice(bgs.length - 18, 18);
        predictedValues.forEach((predictedbg, index) => {
          if (!(index > 17)) {
            bgs.unshift({
              sgv: "" + predictedbg,
              p: true
            });
          }
        });
      } else if (
        extraData.openaps &&
        extraData.openaps.lastPredBGs &&
        extraData.openaps.lastPredBGs.IOB
      ) {
        // OpenAPS
        let predictedValues = extraData.openaps.lastPredBGs.IOB;
        if (extraData.openaps.lastPredBGs.aCOB) {
          predictedValues = extraData.openaps.lastPredBGs.aCOB;
        }
        let modeValue = mode(predictedValues);
        let indexOfModeValue = predictedValues.findIndex(
          pbg => pbg === modeValue
        );
        predictedBg =
          checkForMmol(modeValue, settings) +
          " in " +
          ((indexOfModeValue * 5) / 60).toFixed(1) +
          "h";

        if (extraData.openaps.status) {
          loopStatus = extraData.openaps.status.label;
        }

        bgs.splice(bgs.length - 18, 18);
        predictedValues.forEach((predictedbg, index) => {
          if (!(index > 17)) {
            bgs.unshift({
              sgv: "" + predictedbg,
              p: true
            });
          }
        });
      }
    }
    // check for raw BG if there add to data
    if (extraData.rawbg) {
      if (extraData.rawbg.mgdl) {
        rawbg = "" + extraData.rawbg.mgdl;
      } else {
        rawbg = "";
      }
    }
    // check for basal if there add to data
    if (extraData.basal && extraData.basal.display) {
      tempBasal = "" + extraData.basal.display;
    } else {
      tempBasal = "";
    }

    // check if uploader upbat is there
    if (extraData.upbat && extraData.upbat.display) {
      upbat = "" + extraData.upbat.display;
    } else {
      upbat = "";
    }

    // check if uploader upbat is there
    if (
      extraData.sage &&
      extraData.sage["Sensor Start"] &&
      extraData.sage["Sensor Start"].display
    ) {
      sage = "" + extraData.sage["Sensor Start"].display;
    } else {
      sage = "";
    }
  }

  return {
    bgs,
    rawbg,
    tempBasal,
    predictedBg,
    loopStatus,
    upbat,
    sage
  };
}

/** Do any mutations to the loop status text*/
function checkLoopStatus(status) {
  let text = status;
  if (text == "Recomendation") {
    text = "Recommend";
  }
  return text;
}

// Check The time in betweek each SGV and add LOS value if time is greater then 5 minutes
function checkTimeBetweenGraphPoints(bgs, firstNonPredictiveBg) {
  let firstRun = true;
  let firstNonPredictiveBgIndex = bgs.indexOf(firstNonPredictiveBg);

  bgs.forEach((bg, index) => {
    let nextIndex = index + 1;
    // No need to run on predicted BGS
    if (!bg.p && bgs[nextIndex]) {
      let bgOne = new Date(bgs[index].datetime);
      let bgTwo = new Date(bgs[nextIndex].datetime);
      let bgMinutesDiff = Math.floor(
        (bgOne.getTime() - bgTwo.getTime()) / 1000 / 60
      );
      // pointsToSkip: count of how many points in array we did not have a bg
      let pointsToSkip = Math.ceil(bgMinutesDiff / 5) - 2;
      let indexToMoveTo = index + pointsToSkip;

      if (firstRun) {
        firstRun = false;

        if (pointsToSkip === -1) {
          // if there are more then 2 points that are not LOS from first point
          bgOne = new Date(); // current time
          bgTwo = new Date(bgs[index].datetime);
          bgMinutesDiff = Math.floor(
            (bgOne.getTime() - bgTwo.getTime()) / 1000 / 60
          );
          // pointsToSkip: count of how many points in array we did not have a bg
          pointsToSkip = Math.ceil(bgMinutesDiff / 5) - 2;
          indexToMoveTo = index + pointsToSkip;

          if (pointsToSkip >= 1) {
            for (let i = index; i <= indexToMoveTo; i++) {
              if (i === firstNonPredictiveBgIndex) {
                bgs.splice(i, 0, {
                  ...bgs[i],
                  sgv: "LOS",
                  datetime: bgs[i].datetime
                });
              } else {
                bgs.splice(i, 0, {
                  // ...bgs[i],
                  sgv: "LOS",
                  datetime: bgs[i].datetime
                });
              }
            }
          }
        } else {
          // if its the first point with LOS after it
          if (pointsToSkip >= 1) {
            for (let i = index; i <= indexToMoveTo; i++) {
              bgs.splice(i + 1, 0, {
                sgv: "LOS",
                datetime: bgs[i + 1].datetime
              });
            }
          }
        }
      } else {
        if (pointsToSkip >= 1) {
          for (let i = index; i <= indexToMoveTo; i++) {
            bgs.splice(i + 1, 0, {
              sgv: "LOS",
              datetime: bgs[i + 1].datetime
            });
          }
        }
      }
    }
  });
  // remove any values after 47
  bgs.splice(47, bgs.length - 47);
}

function slopeDirection(trend) {
  switch (trend) {
    case 1:
      return "DoubleUp";
    case 2:
      return "SingleUp";
    case 3:
      return "FortyFiveUp";
    case 4:
      return "Flat";
    case 5:
      return "FortyFiveDown";
    case 6:
      return "SingleDown";
    case 7:
      return "DoubleDown";
    default:
      return "";
  }
}

/**
 * Get Fist BG that is not a predictive BG
 * @param {Array} bgs
 * @returns {Array}
 */
function getfistBgNonPredictiveBG(bgs) {
  return bgs.filter(bg => {
    if (bg.bgdelta || bg.bgdelta === 0) {
      return true;
    }
  })[0];
}
