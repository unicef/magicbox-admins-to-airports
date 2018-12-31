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
bluebird.reduce(airports.features, (h, f) => {
  console.log(f.properties.iata_code)
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
    client.get('/api/coordinates/' + coordinates.reverse().join(','), (err, res, body) => {
      resolve(
        all_admin_level_ids(body[0])
      )
    });
  })
}

function all_admin_level_ids(obj) {
  let ary = Array(5).fill(null)
  for(i = 0; i <=5; i++) {
    if (obj['gid_' + i]) {
      ary[i] = obj['gid_' + i]  
    }
  }
  // if (admin_id) {
  //   admin_id = admin_id.replace('_gadm36', '')
  //   const admin_levels = admin_id.match(/\./g).length
  //   const segments = admin_id.split(/\./)
  //   ary[0] = segments
  //
  //   if (segments.length > 1) {
  //     const suffix = admin_id.match(/_\d$/)
  //     for (i = 1; i <= admin_levels; i++) {
  //       console.log(
  //         segments.slice(0, i).join('.'), suffix
  //       )
  //     }
  //   }
  //}

  console.log(ary)
  return ary.join(',');
}
