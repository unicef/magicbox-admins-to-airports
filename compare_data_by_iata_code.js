const fs = require('fs')
const config = require('./config')
const Promise = require('bluebird')
const request = require('request')
const jsonfile = require('jsonfile')
const rawAirports = require('./airports-raw.json')

// Initialize variables
let airports = fs.readFileSync(process.argv[2]).toString().split('\n').filter((element) => element.length > 0)
let hash = {}
let airportsHash = {}
let notFound = []


// get google maps data
function fetchAPIData(iata_code) {
  return new Promise(function(fulfill, reject) {
    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${iata_code}%20airport&key=${config.google_api_key}`
    request({url: url, json: true}, function (error, response, body) {
      if (error) {
        reject(error)
      }

      fulfill(body)
    })
  }).catch((error) => {
    notFound.push(iata_code)
  })
}

// calculates euclidean distance between two points
function euclideanDistance(x1, y1, x2, y2) {
  return ((x1 - x2)**2 + (y1 - y2)**2)**0.5
}
// print information to lookup
function printInformation(googleData, unicefData) {
  console.log(`\n---- ${unicefData.properties.iata_code} ----`)
  console.log('UNICEF')
  console.log(`${unicefData.geometry.coordinates[1]},${unicefData.geometry.coordinates[0]}`)
  console.log(`${unicefData.properties.name}, ${unicefData.properties.country_name}, ${unicefData.properties.continent_name}`)

  //console.log(unicefData)
  console.log()
  console.log('Google')
  // there is no data to show from google
  if (googleData == null) {
    console.log(`Unable to retrieve address for ${unicefData.properties.iata_code} from Google`)
    return
  }

  console.log(`${googleData.geometry.location.lat},${googleData.geometry.location.lng}`)
  console.log(googleData.formatted_address)
  //console.log(googleData.address_components)
  if (googleData.types.includes('airport')) {
    console.log('is airport')
  }
  console.log('\nLocation absolute error:', euclideanDistance(unicefData.geometry.coordinates[1],
                                                              unicefData.geometry.coordinates[0],
                                                              googleData.geometry.location.lat,
                                                              googleData.geometry.location.lng))
  console.log(`Maps: https://www.google.com.br/maps/dir/${unicefData.geometry.coordinates[1]},${unicefData.geometry.coordinates[0]}/${googleData.geometry.location.lat},${googleData.geometry.location.lng}/`)
  //console.log(googleData)
  console.log('-------------\n')
}

// setup airport hash
rawAirports.features.forEach( (feature) => airportsHash[feature.properties.iata_code] = feature )

Promise.map(airports, function (iata_code) {
   return fetchAPIData(iata_code).then((data) => {
     hash[iata_code] = data

     if ( data && data.results && data.results[0] ) {
       printInformation(data.results[0], airportsHash[iata_code])
     } else {
       printInformation(null, airportsHash[iata_code])
       notFound.push(iata_code)
     }

     return data
  })
}, {concurrency: 2}).then((data) => jsonfile.writeFileSync('./api-output.json', data))
  .then(() => jsonfile.writeFileSync('./hash-output.json', hash))
  .then(() => console.log(notFound))
  .catch((error) => console.error(error))

