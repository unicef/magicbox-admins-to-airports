const airports = require('./airports-raw.json');
const bluebird = require('bluebird');
const request = require('request-json');
const client = request.createClient('http://localhost:8082/');
const fs = require('fs');
let hash = {};
let columns = [
  'iata_code',
  'id_0',
  'id_1',
  'id_2',
  'id_3',
  'id_4',
  'id_5'
]
let rows = [columns];

bluebird.reduce(airports.features.slice(0,10), (h, f) => {
  return fetch_admin(f.geometry.coordinates)
  .then(line => {
    h[f.properties.iata_code] = line;
    return h
  })
}, {concurrency: 1})
.then(h => {
  delete h['concurrency'];
  Object.keys(h).forEach(k => {
    let ary = Array(6);
    h[k].split(',').forEach((e, i) => {
      ary[i] = e;
    })
    ary.unshift(k);
    rows.push(ary)
  })
  console.log(rows.join('\n'))
  fs.writeFile('airport_admins.csv', rows.join('\n') + '\n', (err, data) => {
    console.log('done!');
    process.exit();
  })
})

function fetch_admin(coordinates) {
  return new Promise((resolve, reject) => { // 33.385586,66.445313 // + coordinates.join(',')
    client.get('/api/coordinates/' + coordinates.join(','), (err, res, body) => {
      resolve(
        all_admin_level_ids(body[0].admin_id)
      )
    });
  })
}

function all_admin_level_ids(admin_id) {
  let line = ''
  if (admin_id) {
    var iso = admin_id.slice(0,3);
    var ids = admin_id.match(/\d+_/g)
    .map(e => { return parseInt(e)});

    line = ids.map((e, i) => {
      return iso + '_' + ids.slice(0, i+1).join('_') + '_gadm2-8';
    }).join(',')
  }
  return line
}
