App.sweep = App.sweep || {};
App.sweep.photos = {};

var bitcore = require('bitcore-lib');

function btcToSatoshi(btc) { return Math.round(btc * 1e8); }
function satoshiToBTC(sat) { return sat / 1e8; }

window.ga = function() {};

App.controller('start', function (page) {
  var $page = $(page);
  var $next = $page.find('#buy');
  App.analytics.pageLoad($page.attr('data-page'));

  var $input = $page.find('select');

  var cookies = document.cookie.split(';');
  var lang = 'en';
  cookies.forEach(function(cookie) {
    if (/lang=/.test(cookie)) {
      lang = cookie.replace(/.*lang=(.*)/, '$1');
    }
  });
  if (lang) {
    $input.find('option[value="' + lang + '"]').attr('selected', 'selected');
  }

  $input.on('change', function() {
    var lang = $input.val();
    document.cookie = 'lang=' + lang;
    document.location = '/?lang=' + lang;
  });

  $next.on('click', function(e) {
    App.load('private-key');
  });
});

App.controller('private-key', function (page) {
  var $page = $(page);
  var $next = $page.find('#go-bitcoins');
  var $scan = $page.find('#scan');
  var $photoInput = $page.find('.photo');
  var $photoButton = $page.find('#photo');
  var $video = $page.find('#video');
  var $privateKey = $page.find('#private-key-input');
  var $addressSection = $page.find('.address');
  var $address = $page.find('#address');
  var $balanceConfirmed = $page.find('#unspent-confirmed');
  var $balanceUnconfirmed = $page.find('#unspent-unconfirmed');
  var $instructions = $page.find('.instructions');
  var $instructionsScan = $page.find('.instructions-scan');
  var $wait = $page.find('.wait');
  var $balance = $page.find('.balance');
  var $pendingWarning = $page.find('.unconfirmed');
  var $txFee = $page.find('#tx-fee');
  var $help = $page.find('.help');
  var $helpFee = $page.find('.help-fee');
  var $notPrivateKey = $page.find('.not-a-private-key');
  $wait.hide();
  $balance.hide();
  $pendingWarning.hide();
  $next.parent().hide();
  $scan.parent().hide();
  $video.parent().hide();
  $instructionsScan.hide();
  $addressSection.hide();
  $notPrivateKey.hide();

  $photoButton.on('click', $photoInput.trigger.bind($photoInput, 'click'));
  $photoInput.on('change', function(e) {
    App.sweep.incomingImage('private-key-photo', e);
    qrcode.callback = function(data) {
      var privateKey = parseBitcoinPrivateKey(data);
      if (privateKey) {
        $privateKey.val(privateKey);
        $video.parent().hide();
        $instructions.hide();
        $instructionsScan.hide();
        // setTimeout(function() {
        //   $video.html5_qrcode_stop();
        // }, 0);
      }
    };
    qrcode.decode(App.sweep.photos['private-key-photo']);
  });

  function privateKeyEntered() {
    var privateKey = $privateKey.val().trim();
    if (privateKey.length == 51 || privateKey.length == 52) {
      if (privateKey == App.sweep.bitcoinPrivateKey) return;
      App.sweep.bitcoinPrivateKey = privateKey;

      var valid = App.sweep.validateBitcoinPrivateKey(privateKey);
      if (valid) {
        $notPrivateKey.hide();
        $privateKey.addClass('valid');
        $privateKey.removeClass('invalid');
        // $input.parent().hide();
        // clearInterval(timer);

        var key = new bitcore.PrivateKey(privateKey);
        var fromAddress = key.publicKey.toAddress();
        $address.text(fromAddress);
        $addressSection.fadeIn();
        $wait.show();
        $balance.hide();
        $pendingWarning.hide();
        getBalance(fromAddress, function(err, totals) {
          $wait.hide();
          $balance.show();
          $balanceConfirmed.text(totals.balance);
          $balanceUnconfirmed.text(totals.unconfirmedBalance);
          $txFee.text(satoshiToBTC(10000)); // TODO: ensure this is consistent with what is actually used
          if (totals.unconfirmedBalance != 0) {
            $pendingWarning.show();
            $txFee.parent().hide();
          } else if (totals.balance > 0) {
            $txFee.parent().show();
            showButton();
          } else {
            $txFee.parent().hide();
          }
        });
      } else {
        $privateKey.removeClass('valid');
        $privateKey.addClass('invalid');
        $addressSection.hide();
        $balance.hide();
        $pendingWarning.hide();
        $notPrivateKey.show();
      }
    } else {
      $privateKey.removeClass('valid');
      $privateKey.removeClass('invalid');
      $next.parent().hide();
      $addressSection.hide();
      $balance.hide();
      $pendingWarning.hide();
    }
  }
  // check every five seconds to support iOS pasting, which doesn't fire 'paste' event
  /*var timer = */setInterval(privateKeyEntered, 200);

  function getBalance(fromAddress, done) {
    App.sweep.getBalance(fromAddress, function(err, info) {
      if (err) return done(err);

      done(null, { balance: satoshiToBTC(info.balance), unconfirmedBalance: satoshiToBTC(info.unconfirmedBalance) });
    });
  }

  $privateKey.on('keyup', privateKeyEntered);
  $privateKey.on('paste', privateKeyEntered);

  $next.on('click', function(e) {
    $next.parent().hide();
    if (typeof navigator.getUserMedia == 'function') {
      $video.parent().hide();
      $instructions.hide();
      $instructionsScan.hide();
      $video.html5_qrcode_stop();
    }
    App.load('bitcoin-address');
  });

  function showButton() {
    $next.parent().fadeIn();
  }

  $help.on('click', function(e) {
    App.dialog(App.sweep.dialogHelpBitcoinPrivateKey, function() {
    });
  });
  $helpFee.on('click', function(e) {
    App.dialog(App.sweep.dialogHelpFee, function() {
    });
  });

  function parseBitcoinPrivateKey(privateKeyURI) {
    var key = privateKeyURI.replace(/.*bitcoin:/, '');
    var valid = App.sweep.validateBitcoinPrivateKey(key);
    if (valid) return key;
  }

  function showScanButtonIfPossible() {
    if (typeof MediaStreamTrack === 'function' &&
        typeof MediaStreamTrack.getSources === 'function') {
      MediaStreamTrack.getSources(function(sources) {
        var camera = sources.filter(function(source) {
          return source.kind == 'video';
        });
        if (camera[0]) {
          $scan.parent().show();
          $instructions.show();
          $instructionsScan.show();
        }
      });
    }
  }
  showScanButtonIfPossible();

  $scan.on('click', function(e) {
    $scan.parent().hide();
    $video.parent().show();
    $video.html5_qrcode(function(data) {
      var privateKey = parseBitcoinPrivateKey(data);
      if (privateKey) {
        $notPrivateKey.hide();
        if ($privateKey.val() != privateKey) {
          App.sweep.bitcoinPrivateKey = null;
          $privateKey.val(privateKey);
        }
        // $video.parent().hide();
        // $instructions.hide();
        // $instructionsScan.hide();
        // setTimeout(function() {
        //   $video.html5_qrcode_stop();
        // }, 0);
      } else {
        $privateKey.val('not a private key');
        $notPrivateKey.show();
      }
    }, function(error){
    }, function(videoError){
      App.dialog(App.sweep.dialogErrorReload, function() {
      });
    });
  });
});

App.controller('bitcoin-address', function (page) {
  var $page = $(page);
  var $sweep = $page.find('#go-bitcoins');
  var $scan = $page.find('#scan');
  var $photoInput = $page.find('.photo');
  var $photoButton = $page.find('#photo');
  var $video = $page.find('#video');
  var $address = $page.find('#bitcoin-address-input');
  var $tx = $page.find('.tx');
  var $txAmount = $page.find('#tx-amount');
  var $txFee = $page.find('#tx-fee');
  var $sent = $page.find('.sent');
  var $viewDetails = $page.find('#view-tx');
  var $instructions = $page.find('.instructions');
  var $instructionsScan = $page.find('.instructions-scan');
  var $instructionsNoSelf = $page.find('.self');
  var $help = $page.find('.help');
  var $helpFee = $page.find('.help-fee');
  var $notPublicKey = $page.find('.not-a-public-key');
  $sweep.parent().hide();
  $scan.parent().hide();
  $video.parent().hide();
  $instructionsScan.hide();
  $instructionsNoSelf.hide();
  $sent.hide();
  $tx.hide();
  $viewDetails.parent().hide();
  $notPublicKey.hide();

  $photoButton.on('click', $photoInput.trigger.bind($photoInput, 'click'));
  $photoInput.on('change', function(e) {
    App.sweep.incomingImage('address-photo', e);
    qrcode.callback = function(data) {
      var address = parseBitcoinAddress(data);
      if (address) {
        $video.parent().hide();
        $instructions.hide();
        $instructionsScan.hide();
        $instructionsNoSelf.hide();
        $address.val(address);
        // setTimeout(function() {
        //   $video.html5_qrcode_stop();
        // }, 0);
      }
    };
    qrcode.decode(App.sweep.photos['address-photo']);
  });

  function addressEntered() {
    var address = $address.val().trim();
    if (address.length >= 26 && address.length <= 35) {
      if (App.sweep.bitcoinAddress == address) return;
      App.sweep.bitcoinAddress = address;

      var canSend = false;
      var valid = App.sweep.validateBitcoinAddress(address);

      if (valid) {
        var key = new bitcore.PrivateKey(App.sweep.bitcoinPrivateKey);
        var fromAddress = key.publicKey.toAddress();
        if (fromAddress.toString() === address) {
          $instructionsNoSelf.show();
        } else {
          canSend = true;
          $instructionsNoSelf.hide();
        }
        $notPublicKey.hide();
        $address.addClass('valid');
        $address.removeClass('invalid');
        // $input.parent().hide();
      } else {
        $instructionsNoSelf.hide();
        $notPublicKey.show();
        $address.removeClass('valid');
        $address.addClass('invalid');
      }

      if (canSend) {
        $sweep.parent().show();
        // clearInterval(timer);
        showSweepButton();
      }
    } else {
      $address.removeClass('valid');
      $address.removeClass('invalid');
      $sweep.parent().hide();
    }
  }
  // check every five seconds to support iOS pasting, which doesn't fire 'paste' event
  /*var timer = */setInterval(addressEntered, 200);

  $address.on('keyup', addressEntered);
  $address.on('paste', addressEntered);

  $sweep.on('click', function(e) {
    $scan.parent().hide();
    $instructions.hide();
    $address.parent().hide();
    $instructionsScan.hide();
    $instructionsNoSelf.hide();
    $sweep.parent().hide();
    if (typeof navigator.getUserMedia == 'function') {
      $video.parent().hide();
      $instructions.hide();
      $instructionsScan.hide();
      $instructionsNoSelf.hide();
      $video.html5_qrcode_stop();
    }
    App.sweep.sweepBitcoins(App.sweep.bitcoinPrivateKey, App.sweep.bitcoinAddress, function(tx) {
      $txAmount.text(satoshiToBTC(tx.outputAmount));
      $txFee.text(satoshiToBTC(tx.getFee()));
      $tx.fadeIn();
    }, function(err, result) {
      if (err) {
        App.dialog(App.sweep.dialogErrorReload, function() {
        });
        return;
      }

      showDetailsButton(result.txHash);
    });
  });

  $viewDetails.on('click', function(e) {
    document.location = $viewDetails.data('url');
  });

  function showSweepButton() {
    $sweep.parent().fadeIn();
  }

  function showDetailsButton(txHash) {
    $sent.fadeIn();
    $viewDetails.parent().fadeIn();
    $viewDetails.data('url', 'https://search.bitaccess.co/tx/' + txHash);
  }

  $help.on('click', function(e) {
    App.dialog(App.sweep.dialogHelpBitcoinAddress, function() {
    });
  });
  $helpFee.on('click', function(e) {
    App.dialog(App.sweep.dialogHelpFee, function() {
    });
  });

  function parseBitcoinAddress(addressURI) {
    var address = addressURI.replace(/.*bitcoin:/, '');
    var valid = App.sweep.validateBitcoinAddress(address);
    if (valid) return address;
  }

  function showScanButtonIfPossible() {
    if (typeof MediaStreamTrack === 'function' &&
        typeof MediaStreamTrack.getSources === 'function') {
      MediaStreamTrack.getSources(function(sources) {
        var camera = sources.filter(function(source) {
          return source.kind == 'video';
        });
        if (camera[0]) {
          $scan.parent().show();
          $instructionsScan.show();
        }
      });
    }
  }
  showScanButtonIfPossible();

  $scan.on('click', function(e) {
    $scan.parent().hide();
    $video.parent().show();
    $video.html5_qrcode(function(data) {
      var address = parseBitcoinAddress(data);
      if (address) {
        $notPublicKey.hide();
        if ($address.val() != address) {
          App.sweep.bitcoinAddress = null;
          $address.val(address);
        }
        // $video.parent().hide();
        // $instructions.hide();
        // $instructionsScan.hide();
        // setTimeout(function() {
        //   $video.html5_qrcode_stop();
        // }, 0);
      } else {
        $instructionsNoSelf.hide();
        $address.val('not a public key');
        $notPublicKey.show();
      }
    }, function(error){
    }, function(videoError){
      App.dialog(App.sweep.dialogErrorReload, function() {
      });
    });
  });
});

App.controller('terms', function (page) {
  var $page = $(page);
  App.analytics.pageLoad($page.attr('data-page'));

  var $next = $page.find('.app-button.next');
  var $agree = $page.find('.app-button.agree');
  // var $terms = $page.find('.app-section.terms');
  $next.parent().hide();

  $agree.on('click', function(e) {
    $agree.parent().hide();
    // $terms.hide();
    $next.parent().fadeIn();
  });
});

App.analytics = {
  pageLoad: function(pageId) {
    ga('send', {
      'hitType': 'event',        // Required.
      'eventCategory': 'page',   // Required.
      'eventAction': 'load',     // Required.
      'eventLabel': pageId
    });
  },
  fourOhThree: function() {
    ga('send', {
      'hitType': 'event',          // Required.
      'eventCategory': 'security',   // Required.
      'eventAction': 'violation',  // Required.
      'eventLabel': '403'
    });
  },
  fullyCompletely: function() {
    ga('send', {
      'hitType': 'event',          // Required.
      'eventCategory': 'flow',   // Required.
      'eventAction': 'completion'  // Required.
    });
  }
};

App.sweep.validateBitcoinPrivateKey = function(privateKey) {
  try {
    new bitcore.PrivateKey(privateKey);
  } catch(e) {
    return false;
  }
  return true;
};

App.sweep.validateBitcoinAddress = function(address) {
  try {
    bitcore.Address.fromString(address);
  } catch(e) {
    return false;
  }
  return true;
};

App.sweep.sweepBitcoins = function(privateKey, toAddress, onTx, done) {
  var key = new bitcore.PrivateKey(privateKey);
  var fromAddress = key.publicKey.toAddress();

  App.sweep.getUnspents(fromAddress, function(err, unspents) {
    if (err) return done(err);

    var confirmedUnspents = App.sweep.filterInputsByConfirmation(unspents, true);
    var transaction = App.sweep.createTransaction(key, toAddress, confirmedUnspents);

    if (!transaction) {
      return done(new Error('unable to create transaction'));
    }
    App.sweep.lastTransaction = transaction;
    onTx(transaction);

    if (confirmedUnspents.length < unspents.length) {
      var unconfirmedSatoshis = App.sweep.tallyInputs(App.sweep.filterInputsByConfirmation(unspents, false));

      var dialog = App.sweep.dialogUnconfirmedInputs;
      dialog.text = dialog.text.replace(/TT_AMOUNT/, satoshiToBTC(unconfirmedSatoshis) + '');
      App.dialog(dialog, function(proceed) {
        if (proceed) broadcast();
      });
    } else {
      broadcast();
    }

    function broadcast() {
      App.sweep.broadcastTransaction(transaction, done);
    }
  });
};

App.sweep.filterInputsByConfirmation = function(unspents, confirmed) {
  return unspents;
  // return unspents.filter(function(unspent) {
  //   if (confirmed) return unspent.confirmations > 0;
  //   return unspent.confirmations == 0;
  // });
};

App.sweep.tallyInputs = function(inputs) {
  return inputs.reduce(function(runningTotal, unspent) {
    runningTotal += btcToSatoshi(unspent.amount);
    return runningTotal;
  }, 0);
};

App.sweep.createTransaction = function(privateKey, toAddress, unspents) {
  var total = App.sweep.tallyInputs(unspents);
  var amount = total - 10000; // create fee
  if (amount > 0) {
    var transaction = new bitcore.Transaction()
      .from(unspents)
      .to(toAddress, amount)
      .sign(privateKey);
    return transaction;
  }
};

App.sweep.getBalance = function(address, done) {
  var url = '/app/info/' + address;
  $.ajax({
    type: 'GET',
    url: url,
    dataType: 'json',
    success: function(data) {
      if (!data) return done(new Error('no data in response from ' + url));
      done(null, data);
    },
    error: function(xhr, type, err) {
      done(new Error('unknown error'), err);
    }
  });
};

App.sweep.getUnspents = function(address, done) {
  var url = '/app/unspents/' + address;
  $.ajax({
    type: 'GET',
    url: url,
    dataType: 'json',
    success: function(data) {
      if (!data) return done(new Error('no data in response from ' + url));
      done(null, data);
    },
    error: function(xhr, type, err) {
      done(new Error('unknown error'), err);
    }
  });
};

App.sweep.broadcastTransaction = function(transaction, done) {
  var url = '/app/broadcast';
  $.ajax({
    type: 'POST',
    url: url,
    data: JSON.stringify({ tx_hex: transaction.serialize() }),
    contentType: 'application/json',
    dataType: 'json',
    success: function(data) {
      done(null, data);
    },
    error: function(xhr, type, err) {
      done(new Error('unknown error'), err);
    }
  });
};

App.sweep.incomingImage = function(id, event) {
  if (event.target.files.length == 1 && event.target.files[0].type.indexOf('image/') == 0) {
    var url = URL.createObjectURL(event.target.files[0]);
    App.sweep.photos[id] = url;
  }
};

App.load('start');

