let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let fs = require('fs');
let Papa = require('papaparse');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.post('/oeis-sequence-names', function(req, res, next) {
  const aNumbers = req.body.aNumbers;
  const sequenceNames = {};
  fs.readFile(path.join(__dirname, 'public/sequence-names.csv'), 'utf-8', (err, data) => {
    if (err) {
      console.error(err);
      next(createError(500));
      return;
    }
    // console.log(data);
    try {
      Papa.parse(data, {
        delimiter: ' ',
        comments: true,
        worker: false,
        chunk(results, parser) {
          // parser.pause();
          for (let row of results.data) {
            if (aNumbers.includes(row[0])) {
              sequenceNames[row[0]] = row.slice(1).join(' ');
              // const references = [...copy[row[0]].matchAll(/A\d{6}/g)
              // for (let reference of references) {
              //
              }
          }
          // FIXME: Is this somewhow causing unending requests?
          // parser.resume();
        },
        complete() {
          for (let aNumber in sequenceNames) {
            sequenceNames[aNumber] = sequenceNames[aNumber].replace(/(A\d{6})/g, m => `"${sequenceNames[m[1]]}"`);
          }
          res.send(JSON.stringify(sequenceNames));
        }
      });
    } catch (error) {
      console.error(error);
      next(createError(500));
    }
  });
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
