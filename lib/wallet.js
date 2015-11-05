
var explorers = require('bitcore-explorers');

var INSIGHT_URL = 'https://search.bitaccess.co';
var client = new explorers.Insight(INSIGHT_URL);

function Wallet(network) {

  function getAddressInfo(address, done) {
    client.address(address, done);
  }

  function getUnspentUtxos(address, done) {
    client.getUnspentUtxos(address, done);
  }

  function broadcast(transaction, done) {
    client.broadcast(transaction, done);
  }

  return {
    getAddressInfo: getAddressInfo,
    getUnspentUtxos: getUnspentUtxos,
    broadcast: broadcast
  };
}

module.exports = Wallet;
