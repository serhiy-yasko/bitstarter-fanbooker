var express = require('express')
  , http    = require('http')
  , path    = require('path')
  , async   = require('async')
  , passport = require('passport')
  , bcrypt = require('bcrypt-nodejs')
  , nodemailer = require('nodemailer')
  , LocalStrategy = require('passport-local').Strategy
  //, GoogleStrategy = require('passport-google').Strategy
  , db      = require('./models')
  , ROUTES  = require('./routes');

var cryptPassword = function(password, callback) {
   bcrypt.genSalt(10, function(err, salt) {
       if (err) return callback(err);
       else {
           bcrypt.hash(password, salt, null, function(err, hash) {
               return callback(err, hash);
           });
       }
   });
};

var comparePassword = function(password, userPassword, callback) {
    bcrypt.compare(password, userPassword, function(err, isPasswordMatch) {
	if (err) return callback(err);
	else return callback(null, isPasswordMatch);
    });
};

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
    var cb = function(user_json, err) {
        if (err) {
            console.log(err);
            response.send("Error retrieving the user from the database.");
        }
        var user = JSON.parse(user_json);
        if (user) { fn(null, user); }
        else { fn(new Error('User ' + id + ' does not exist')); }
    };
    global.db.User.findAccountById(id, cb);
}

function findByEmail(username, fn) {   
    var cb = function(user_json, err) {
        if (err) {
            console.log(err);
            response.send("Error retrieving the user from the database.");
        }
	var user = JSON.parse(user_json);
        if (user.email === username) { return fn(null, user); }
	else { return fn(null, null); }
    };
    global.db.User.findAccountByEmail(username, cb); 
}

function ensureAuthenticated(request, response, next) {
  if (request.isAuthenticated()) { return next(); }
  response.redirect('/login')
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

    { usernameField: 'user[email]',
      passwordField: 'user[password]'},

    function (username, password, done) {
        process.nextTick(function () {
	    findByEmail(username, function(err, user) {
		if (err) { console.log(err); return done(err); }
		if (!user) { return done(null, false, { message: 'Unknown user email ' + username }); }
		var callback = function(err, isPasswordMatch) {
                    if (err) { console.log(err); }
                    if (isPasswordMatch) { 
			return done(null, user); 
		    } else { 
			return done(null, false, { message: 'Invalid password' });
		    }
		};
		comparePassword(password, user.password, callback);
	    })
	});
    }
));

/*
// ... Putting aside GoogleStrategy for now 
//
// Use the GoogleStrategy within Passport
passport.use(new GoogleStrategy({
    returnURL: 'http://ec2-54-200-71-156.us-west-2.compute.amazonaws.com:8080/auth/google/return',
    realm: 'http://ec2-54-200-71-156.us-west-2.compute.amazonaws.com:8080/'
  },
  function(identifier, profile, done) {
      process.nextTick(function () {      
	  profile.identifier = identifier;
	  return done(null, profile);
      }); 
  }
));
*/

// MAIN APP CONFIGURATION

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8080);
app.set('trans_email_address', process.env.TRANS_EMAIL_ADDRESS);
app.set('trans_email_password', process.env.TRANS_EMAIL_PASSWORD);
app.set('email_address', process.env.EMAIL_ADDRESS);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.favicon(path.join(__dirname, 'public/img/favicon.ico')));
app.use(express.logger("dev"));
app.use(express.bodyParser());
app.use(express.cookieParser());
// app.use(express.urlencoded()); 
// app.use(express.json());
// app.use(express.methodOverride());
app.use(express.session({ secret: 'terces' }));
app.use(passport.initialize());
app.use(passport.session());

for(var ii in ROUTES) {
    app.get(ROUTES[ii].path, ROUTES[ii].fn);
}

// PASSPORT GEAR [2]

/*
// ... Putting aside GoogleStrategy for now
//
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
*/

app.post('/register_new_user',
	 function(request, response) {
	     var cb = function(user_json, err) {
		 if (err) {
		     console.log(err);
		     response.send(500, {error: "Error registering the new user."});
		 } else {
		     response.redirect('/');
		 }
	     };
	     var callback = function(err, hash) {
		 if (err) {
		     console.log(err);
		     response.send(500, {error: "Error encrypting password."});
		 } else {
		     var user_form_data = {
			 username: request.body.user.username,
			 firstname: request.body.user.firstname,
			 lastname: request.body.user.lastname,
			 email: request.body.user.email,
			 password: hash 
		     };
		     global.db.User.addUserAccount(user_form_data, cb);
		 }
	     };
	     cryptPassword(request.body.user.password, callback);
});

app.post('/sign_in', 
	 function(request, response, next) {
	     passport.authenticate('local', 
				   function(err, user, info) {
				       if (err) { 
					   console.log(err); 
					   return next(err); 
				       }
				       if (!user) {
					   request.session.messages = [info.message];
					   return response.redirect('/login');
				       }
				       request.logIn(user, function(err) {
					   if (err) { console.log(err); return next(err); }
					   return response.redirect('/');		
				       });
				   })(request, response, next);
});

app.post('/suggest_event',
	function(request, response) {
	    var callback = function(performer_json, err) {
		if (err) {
		    console.log(err);
		    console.log('The performer was not saved');
		}
		console.log('The performer was saved');
	    };
	    var cb = function(event_json, err) {
		if (err) {
		    console.log(err);
		    console.log('The event was not saved');
		}
		console.log('The event was saved');
		var event = JSON.parse(event_json);
		var new_performer_data = {
		    name: event.performer,
                    email: '',
                    address: '',
                    contactPerson: '',
                    performerType: ''
		};
		global.db.Performer.addPerformer(new_performer_data, callback);
		return response.redirect('/account');
	    };
	    var event_form_data = {
		performer: request.body.performer,
		city: request.body.city,
		venue: '',
		agency: '',
		date: '',
		comment: request.body.comment,
		vote_counter: 1,
		initiator_id: request.user.id,
		upvoters_ids: []
	    };
	    global.db.Event.addEvent(event_form_data, cb);
});

app.post('/upvote_event',
	function(request, response) {
	    var up_event_id = request.param('upvote_event_id');
	    var cb = function(event_json, err) {
		if (err) {
		    console.log(err);
		    console.log('The record was not updated');
		}
		console.log('The record was updated');
		return response.redirect('/events');
	    };
	    global.db.Event.incrementVoteCounter(up_event_id, request.user.id, cb);
});

app.post('/send_message',
	 function(request, response) {
	     var smtpTransport = nodemailer.createTransport("SMTP", {
		 service: "Gmail",
		 auth: {
		     user: app.get('trans_email_address'),
		     pass: app.get('trans_email_password')
		 }
	     });
	     console.log('SMTP Configured');
	     smtpTransport.sendMail({
		 from: request.body.form_mail.email,
		 to: app.get('email_address'),
		 subject: "[Fanbooker] Message from " + request.body.form_mail.name,
		 text: "Sender email: " + request.body.form_mail.email + "\n\n" + request.body.form_mail.message
	     }, function(err, response) {
		 if (err) { console.log(err); }
		 else { console.log("Message sent: " + response.message); }
	     });
	     response.redirect('/contact');
});

app.get('/logout', function(request, response) {
    request.logout();
    response.redirect('/');
});

// SEQUELIZE GEAR

//global.db.User.hasMany(global.db.Event);
//global.db.Event.belongsTo(global.db.User, {as: 'Initiator'});

global.db.sequelize.sync().complete(function(err) {
    if (err) {
	throw err;
    } else {
	var DB_REFRESH_INTERVAL_SECONDS = 600;
	var agency_objects = [
	    { name: 'AZH Promo',
	      phone: '+38 (097) 903-09-28',
	      website: 'http://promo.azh.com.ua/',
	      email: 'promo@azh.com.ua' },
	    { name: 'FIGHT Music',
	      phone: '+38 (050) 334-90-20',
	      website: 'http://www.fightmusic.com.ua/',
	      email: 'fight@fightmusic.com.ua' }
	];
	var venue_objects = [
	    { name: 'BINGO Club',
	      address: 'Ukraine, 03115, Kyiv, Prospekt Pobedy 112',
	      phone: '+38 (044) 42-42-555',
	      website: 'http://www.bingo.ua',
	      venueType: 'club' },
	    { name: 'DIVAN Restaurant',
	      address: 'Ukraine, 01004, Kyiv, Ploscha Besarabska 2',
	      phone: '+38 (067) 232-64-00',
	      website: 'http://www.festrestdivan.com.ua',
	      venueType: 'restaurant' }
	];
	async.series([
	    function(callback) {
		for (var i = 0; i < agency_objects.length; i++) {
		    var cb = function(agency_json, err) {
			if (err) {
			    console.log(err);
			    console.log('The agency was not saved');
			}
			console.log('The agency was saved');
		    };
		    var agency_object = agency_objects[i];
		    global.db.Agency.addAgency(agency_object, cb);
		}
		callback(null);
	    },
	    function(callback) {
		for (var j = 0; j < venue_objects.length; j++) {
		    var cb = function(venue_json, err) {
			if (err) {
			    console.log(err);
			    console.log('The venue was not saved');
			}
			console.log('The venue was saved');
		    };
		    var venue_object = venue_objects[j];
		    global.db.Venue.addVenue(venue_object, cb);
		}
		callback(null);
	    },
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
