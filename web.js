var express = require('express')
  , http    = require('http')
  , path    = require('path')
  , async   = require('async')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , GoogleStrategy = require('passport-google').Strategy
  , db      = require('./models')
  , ROUTES  = require('./routes');

/*
  Initialize the Express app, the E in the MEAN stack (from mean.io).

  Templates: First, we configure the directory in which the Express app will
  look for templates, as well as the engine it'll use to interpret them (in
  this case Embedded JS). So we can use the views/orderpage.ejs and
  views/homepage.ejs files in response.render (see routes.js).

  Port: We then set up the port that the app will listen on by parsing the
  variable that's configured in .env (or else using a default).

  Static file serving: Then we set up express for static file serving, by
  making the entire content under '/public' accessible on the WWW. Thus
  every file <file-name> in /public is served at example.com/<file-name>. We
  specifically instruct the app to look for a particular file called the
  favicon.ico; this is what browsers use to represent minified sites in
  tabs, bookmarks, and favorites (hence 'favicon = favorite icon'). By
  default the query would go to example.com/favicon.ico, but we redirect it
  to example.com/public/img/favicon.ico as shown.

  Logging: We set up a convenient dev logger so that you can watch
  network requests to express in realtime. Run foreman start in the home
  directory after following the instructions in README.md and Express
  will begin printing logging information to the command line.

  Routes: We have separated the routing information into a separate
  routes.js file, which we import. This tell the app what function to
  execute when a client accesses a URL like example.com/ or
  example.com/orders. See routes.js for more details.

  Init: Finally, we synchronize the database, start the HTTP server, and
  also start a simple 'daemon' in the background via the setInterval
  command.

  Regarding the daemon: this is a great example of the use of asynchronous
  programming and object-oriented programming.

  First, some background: A daemon is a process that runs in the background
  at specified intervals; for example, you'd use it to keep a search index
  up to date, run an antivirus scan, or periodically defrag a hard
  drive. You also want to use daemons to synchronize with remote services
  and update dashboards. Why? Let's say you have 10000 people visiting your
  website per hour, and on the front page you have some kind of statistic
  that depends on an API call to a remote website (e.g. the number of Tweets
  that mention a particular string). If you do it naively and query the
  remote servers each time, you will repeat work for each new HTTP request
  and issue 10000 API calls in just an hour. This will probably get you
  banned. The underlying problems is that you do not want to have the number
  of API calls scale with the number of viewers. So instead you have a
  'daemon' running asynchronously in the background that refreshes the
  displayed statistic every 10 minutes (say), such that you only make 6 API
  calls per hour rather than N=10000 or more.

  In our app, the statistic we are displaying on the front page is the
  thermometer and the remote service is Coinbase. The idea is that we want
  to hit the remote Coinbase servers at regular intervals to mirror the
  order data locally. Previously, we added the capability to manually force
  mirroring of the Coinbase data to the local server by navigating to
  example.com/refresh_orders, which will trigger the refresh_orderfn in
  routes.js. However, by isolating the refresh code to a single method
  invocation (global.db.Order.refreshFromCoinbase), we can also call it in
  another function. We do so within the scope of a setInterval invocation
  (below), which calls the specified function periodically.  Now we can
  refresh in two places.

  So, to recap: by isolating the refresh code within a method call on the
  Order object, we could call it in two places. And by using the built-in
  asynchronous features of node, we can easily have both the HTTP server and
  the setInterval daemon working at the same time: the server is listening
  for requests while the daemon is working in the background on a periodic
  schedule.
*/

// PASSPORT GEAR [1]

function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

// Passport session setup
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    findById(id, function (err, user) {
	done(err, user);
    });
});

// Use the Local Strategy within Passport
passport.use(new LocalStrategy(
    function (username, password, done) {
        process.nextTick(function () {
	    
	});
    }
));

// Use the GoogleStrategy within Passport
passport.use(new GoogleStrategy({
    returnURL: 'http://ec2-54-201-92-109.us-west-2.compute.amazonaws.com:8080/auth/google/return',
    realm: 'http://ec2-54-201-92-109.us-west-2.compute.amazonaws.com:8080/'
  },
  function(identifier, profile, done) {
      process.nextTick(function () {      
	  profile.identifier = identifier;
	  return done(null, profile);
      }); 
  }
));

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8080);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.favicon(path.join(__dirname, 'public/img/favicon.ico')));
app.use(express.logger("dev"));
app.use(express.bodyParser());
app.use(express.cookieParser());
// app.use(express.urlencoded()); 
// app.use(express.json());
// app.use(express.bodyParser());
// app.use(express.methodOverride());
app.use(express.session({ secret: 'terces' }));
app.use(passport.initialize());
app.use(passport.session());

for(var ii in ROUTES) {
    app.get(ROUTES[ii].path, ROUTES[ii].fn);
}

// PASSPORT GEAR [2]

// Redirect the user to Google for authentication.  When complete, Google
// will redirect the user back to the application at
//     /auth/google/return
app.get('/auth/google', 
	passport.authenticate('google'));

// Google will redirect the user to this URL after authentication.
// Finish the process by verifying the assertion.
// If valid, the user will be logged in. Otherwise, authentication has failed.
app.get('/auth/google/return', 
	passport.authenticate('google', { failureRedirect: '/register' }),
	function(request, response) {
	    var cb = function(user_json, err) {
		if(err) {
		    console.log(err);
		    response.send("Error processing user.");
		} else {
		    response.redirect('/account');
		}
	    };
	    global.db.User.addUserAccount(request.user, cb);
	}
);

app.post('/register_new_user',
	 function(request, response) {
	     var cb = function(err) {
		 if(err) {
		     console.log(err);
		     response.send("Error registering the new user.");
		 } else {
		     response.redirect('/');
		 }
	     };
	        	     
	     global.db.User.addUserAccount(request.body.user, cb);
});

app.post('/login', 
	 function(request, response, next) {
	     passport.authenticate('local', function(err, user, info) {
		 if (err) { return next(err); }
		 if (!user) {
		     request.session.messages = [info.message];
		     return response.redirect('/register');
		 }
		 request.logIn(user, function(err) {
		     if (err) { return next(err); }
		     return response.redirect('/');
		 });
	     })(request, response, next);
});

app.get('/logout', function(request, response) {
    request.logout();
    response.redirect('/');
});

global.db.sequelize.sync().complete(function(err) {
    if (err) {
	throw err;
    } else {
	var DB_REFRESH_INTERVAL_SECONDS = 600;
	async.series([
	    function(cb) {
		// Mirror the orders before booting up the server
		console.log("Initial mirror of Coinbase orders at " + new Date());
		global.db.Order.refreshFromCoinbase(cb);
	    },
	    function(cb) {
		// Begin listening for HTTP requests to Express app
		http.createServer(app).listen(app.get('port'), function() {
		    console.log("Listening on " + app.get('port'));
		});

		// Start a simple daemon to refresh Coinbase orders periodically
		setInterval(function() {
		    console.log("Refresh db at " + new Date());
		    global.db.Order.refreshFromCoinbase(cb);
		}, DB_REFRESH_INTERVAL_SECONDS*1000);
		cb(null);
	    }
	]);
    }
});
