var express = require('express');

var wallet = require('../lib/wallet')();

var router = express.Router();

router.get('/info/:address', function(req, res, next) {
  wallet.getAddressInfo(req.params.address, function(err, info) {
    res.status(200).send(info);
  });
});

router.get('/unspents/:address', function(req, res, next) {
  wallet.getUnspentUtxos(req.params.address, function(err, unspents) {
    res.status(200).send(unspents);
  });
});

router.post('/broadcast', function(req, res) {
  wallet.broadcast(req.body.tx_hex, function(err, result) {
    if (err) console.error(err.message);
    res.status(200).send({ txHash: result });
  });
});

module.exports = router;
