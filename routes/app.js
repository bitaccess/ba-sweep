var express = require('express');

var wallet = require('../lib/wallet')();

var router = express.Router();

// var TESTING = process.env.BITACCESS_TEST == '1';

function readyEndpoints() {
  router.get('/info/:address', function(req, res, next) {
    wallet.getAddressInfo(req.params.address, function(err, info) {
      console.log('returned:', info);
      res.status(200).send(info);
    });
  });

  router.get('/unspents/:address', function(req, res, next) {
    wallet.getUnspentUtxos(req.params.address, function(err, unspents) {
      console.log('returned:', unspents);
      res.status(200).send(unspents);
    });
  });

  router.post('/broadcast', function(req, res) {
    console.log('/broadcast:', req.body);
    wallet.broadcast(req.body.tx_hex, function(err, result) {
      if (err) console.error(err.message);
      console.log(result);
      res.status(200).send({ txHash: result });
    });
    // var errors = validateRequest(req.body, ['amount_btc']);
    // if (errors.length) return res.status(400).send({ error: errors.join(',') });
  });
}

// function notifySlack(message) {
//   if (TESTING) return console.log('TEST MODE, Slack disabled:', message);
//   var url = 'https://bitaccess.slack.com/services/hooks/slackbot?token=9tCC9nBWiXZOEx24NpVarNN0&channel=%23general';
//   request.post({ url: url, form: message }, function(err, res, body) {
//     if (err) console.error('Error posting to Slack:', err.message);
//   });
// }

// function validateRequest(body, requiredParams) {
//   var errors = [];
//   requiredParams.forEach(function(param) {
//     if (body[param] === undefined) errors.push('missing ' + param);
//   });
//   return errors;
// }

readyEndpoints();

module.exports = router;
