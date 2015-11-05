App.sweep = App.sweep || {};
App.sweep.photos = {};

var bitcore = require('bitcore-lib');

function btcToSatoshi(btc) { return Math.round(btc * 100000000); }
function satoshiToBTC(sat) { return sat / 100000000; }

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
  var $balanceConfirmed = $page.find('#unspent-confirmed');
  var $balanceUnconfirmed = $page.find('#unspent-unconfirmed');
  var $instructions = $page.find('.instructions');
  var $instructionsScan = $page.find('.instructions-scan');
  var $help = $page.find('.help');
  $next.parent().hide();
  $scan.parent().hide();
  $video.parent().hide();
  $instructionsScan.hide();

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

  var listening = true;
  function privateKeyEntered() {
    var privateKey = $privateKey.val().trim();
    if (privateKey.length == 52) {
      if (!listening) return;
      listening = false;
      App.sweep.validateBitcoinPrivateKey(privateKey, function(err, valid) {
        if (err) {
          $privateKey.removeClass('valid');
          $privateKey.addClass('invalid');
          return;
        }

        if (valid) {
          $privateKey.addClass('valid');
          $privateKey.removeClass('invalid');
          // $input.parent().hide();
          // clearInterval(timer);
          App.sweep.bitcoinPrivateKey = privateKey;

          getBalance(privateKey, function(err, totals) {
            console.log(totals);
            $balanceConfirmed.text(totals.balance);
            $balanceUnconfirmed.text(totals.unconfirmedBalance);
            if (totals.balance > 0) showButton();
          });
        } else {
          $privateKey.removeClass('valid');
          $privateKey.addClass('invalid');
        }
      });
    } else {
      $privateKey.removeClass('valid');
      $privateKey.removeClass('invalid');
      $next.parent().hide();
      listening = true;
    }
  }
  // check every five seconds to support iOS pasting, which doesn't fire 'paste' event
  /*var timer = */setInterval(privateKeyEntered, 200);

  function getBalance(privateKey, done) {
    var key = new bitcore.PrivateKey(privateKey);
    var fromAddress = key.publicKey.toAddress();

    App.sweep.getBalance(fromAddress, function(err, info) {
      if (err) return done(err);

      done(null, { balance: satoshiToBTC(info.balance), unconfirmedBalance: satoshiToBTC(info.unconfirmedBalance) });
    });
  }

  $privateKey.on('keyup', privateKeyEntered);
  $privateKey.on('paste', privateKeyEntered);

  function showButton() {
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
    $next.parent().fadeIn();
  }

  $help.on('click', function(e) {
    App.dialog(App.sweep.dialogHelpBitcoinPrivateKey, function() {
    });
  });

  function parseBitcoinPrivateKey(privateKeyURI) {
    return privateKeyURI.replace(/bitcoin:/, '');
  }

  if (typeof MediaStreamTrack === 'function') {
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

  $scan.on('click', function(e) {
    $scan.parent().hide();
    $video.parent().show();
    var listening = true;
    $video.html5_qrcode(function(data) {
      // console.log('scan:', data);
      if (!listening) return;
      var privateKey = parseBitcoinPrivateKey(data);
      if (privateKey) {
        listening = false;
        $privateKey.val(privateKey);
        $video.parent().hide();
        $instructions.hide();
        $instructionsScan.hide();
        setTimeout(function() {
          $video.html5_qrcode_stop();
        }, 0);
      }
    }, function(error){
      // console.log('scan error:', error);
    }, function(videoError){
      // console.log('video error:', videoError);
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
  var $sent = $page.find('.sent');
  var $viewDetails = $page.find('#view-tx');
  var $instructions = $page.find('.instructions');
  var $instructionsScan = $page.find('.instructions-scan');
  var $help = $page.find('.help');
  $sweep.parent().hide();
  $scan.parent().hide();
  $video.parent().hide();
  $instructionsScan.hide();
  $sent.hide();
  $viewDetails.parent().hide();

  $photoButton.on('click', $photoInput.trigger.bind($photoInput, 'click'));
  $photoInput.on('change', function(e) {
    App.sweep.incomingImage('address-photo', e);
    qrcode.callback = function(data) {
      var address = parseBitcoinAddress(data);
      if (address) {
        $address.val(address);
        $video.parent().hide();
        $instructions.hide();
        $instructionsScan.hide();
        // setTimeout(function() {
        //   $video.html5_qrcode_stop();
        // }, 0);
      }
    };
    qrcode.decode(App.sweep.photos['address-photo']);
  });

  var listening = true;
  function addressEntered() {
    var address = $address.val().trim();
    if (address.length == 34) {
      if (!listening) return;
      listening = false;
      App.sweep.validateBitcoinAddress(address, function(err, valid) {
        if (err) {
          $address.removeClass('valid');
          $address.addClass('invalid');
          return;
        }

        if (valid) {
          $address.addClass('valid');
          $address.removeClass('invalid');
          // $input.parent().hide();
          $sweep.parent().show();
          // clearInterval(timer);
          showSweepButton();
          App.sweep.bitcoinAddress = address;
        } else {
          $address.removeClass('valid');
          $address.addClass('invalid');
        }
      });
    } else {
      $address.removeClass('valid');
      $address.removeClass('invalid');
      $sweep.parent().hide();
      listening = true;
    }
  }
  // check every five seconds to support iOS pasting, which doesn't fire 'paste' event
  /*var timer = */setInterval(addressEntered, 200);

  $address.on('keyup', addressEntered);
  $address.on('paste', addressEntered);

  $sweep.on('click', function(e) {
    $sweep.parent().hide();
    if (typeof navigator.getUserMedia == 'function') {
      $video.parent().hide();
      $instructions.hide();
      $instructionsScan.hide();
      $video.html5_qrcode_stop();
    }
    App.sweep.sweepBitcoins(App.sweep.bitcoinPrivateKey, App.sweep.bitcoinAddress, function(err, result) {
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

  function parseBitcoinAddress(addressURI) {
    return addressURI.replace(/bitcoin:/, '');
  }

  if (typeof MediaStreamTrack === 'function') {
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

  $scan.on('click', function(e) {
    $scan.parent().hide();
    $video.parent().show();
    var listening = true;
    $video.html5_qrcode(function(data) {
      // console.log('scan:', data);
      if (!listening) return;
      var address = parseBitcoinAddress(data);
      if (address) {
        listening = false;
        $address.val(address);
        $video.parent().hide();
        $instructions.hide();
        $instructionsScan.hide();
        setTimeout(function() {
          $video.html5_qrcode_stop();
        }, 0);
      }
    }, function(error){
      // console.log('scan error:', error);
    }, function(videoError){
      // console.log('video error:', videoError);
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

App.sweep.validateBitcoinPrivateKey = function(privateKey, done) {
  setTimeout(function() {
    done(null, true);
  }, 100);
};

App.sweep.validateBitcoinAddress = function(address, done) {
  setTimeout(function() {
    done(null, true);
  }, 100);
};

App.sweep.sweepBitcoins = function(privateKey, toAddress, done) {
  var key = new bitcore.PrivateKey(privateKey);
  var fromAddress = key.publicKey.toAddress();

  App.sweep.getUnspents(fromAddress, function(err, unspents) {
    if (err) return done(err);

    var confirmedUnspents = App.sweep.filterInputsByConfirmation(unspents, true);
    var transaction = App.sweep.createTransaction(key, toAddress, confirmedUnspents);

    if (!transaction) {
      return done(new Error('unable to create transaction'));
    }
    console.log('transaction:', transaction.toJSON());
    App.sweep.lastTransaction = transaction;

    if (confirmedUnspents.length < unspents.length) {
      var unconfirmedSatoshis = App.sweep.tallyInputs(App.sweep.filterInputsByConfirmation(unspents, false));
      console.log('unconfirmedSatoshis:', unconfirmedSatoshis);

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
  console.log('total unspent:', total);
  var amount = total - (60 * 100); // 60 bits is the fee I can remember
  console.log('minus fee:', amount);
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
  console.log('url:', url);
  $.ajax({
    type: 'GET',
    url: url,
    dataType: 'json',
    success: function(data) {
      if (!data) return done(new Error('no data in response from ' + url));
      done(null, data);
    },
    error: function(xhr, type, err) {
      // console.log(err);
      done(new Error('unknown error'), err);
    }
  });
};

App.sweep.getUnspents = function(address, done) {
  var url = '/app/unspents/' + address;
  console.log('url:', url);
  $.ajax({
    type: 'GET',
    url: url,
    dataType: 'json',
    success: function(data) {
      if (!data) return done(new Error('no data in response from ' + url));
      done(null, data);
    },
    error: function(xhr, type, err) {
      // console.log(err);
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
      // console.log(err);
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

