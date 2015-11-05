
var path = require('path');

var TESTING = process.env.BITACCESS_TEST == '1';
if (!TESTING) require('newrelic');

var express    = require('express');
var swig       = require('swig');
var favicon    = require('serve-favicon');
var logger     = require('morgan');
var bodyParser = require('body-parser');
var enforce    = require('express-sslify');
var helmet     = require('helmet');
var I18n       = require('i18n-2');
 
var appRoutes = require('./routes/app');

var app = express();

(function() {
  var locales = ['en', 'hr_hr', 'da', 'nl', 'nl_be', 'fi', 'fr', 'de', 'hu', 'it', 'sl_si', 'es', 'sv'];
  I18n.expressBind(app, { locales: locales });
  app.use(function(req, res, next) {
    req.i18n.setLocaleFromQuery();
    next();
  });
})();

console.log('environment:', app.get('env'));
if (app.get('env') === 'production') {
  // force redirect to HTTPS on Heroku
  console.log('forcing redirect to HTTPS for all requests.');
  var reverseProxy = true;
  app.use(enforce.HTTPS(reverseProxy));
}

// view engine setup
app.engine('html', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.set('view cache', false);
swig.setDefaults({ cache: false });

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
if (app.get('env') === 'development') {
  app.use(logger('dev'));
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
if (app.get('env') === 'development') {
  // for source maps
  app.use(express.static(path.join(__dirname, 'src')));
}

// add additional security practices
app.use(helmet());

var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', {
    lang: req.query.lang
  });
});

app.use('/', router);

app.use('/app', appRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500).send(err.message);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  console.log(err.message);
  res.status(err.status || 500).send();
  // res.render('error', {
  //     message: err.message,
  //     error: {}
  // });
});

module.exports = app;

