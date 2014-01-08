var uu        = require('underscore')
  , db        = require('./models')
  , Constants = require('./constants');

var build_errfn = function(errmsg, response) {
    return function errfn(err) {
	console.log(err);
	response.send(errmsg);
    };
};

var venue_objects = [
    { id: 1,
      name: 'BINGO Club',
      address: 'Ukraine, 03115, Kyiv, Prospekt Pobedy 112',
      phone: '+38 (044) 42-42-555',
      website: 'http://www.bingo.ua',
      venueType: 'club' },
    { id: 2,
      name: 'DIVAN Restaurant',
      address: 'Ukraine, 01004, Kyiv, Ploscha Besarabska 2',
      phone: '+38 (067) 232-64-00',
      website: 'http://www.festrestdivan.com.ua',
      venueType: 'restaurant' }
]

var agency_objects = [
    { id: 1,
      name: 'AZH Promo',
      phone: '+38 (097) 903-09-28',
      website: 'http://promo.azh.com.ua/',
      email: 'promo@azh.com.ua' },
    { id: 2,
      name: 'FIGHT Music',
      phone: '+38 (050) 334-90-20',
      website: 'http://www.fightmusic.com.ua/',
      email: 'fight@fightmusic.com.ua' }
]

global.db.Venue.bulkCreate(venue_objects, Object)
    .success(function() { console.log("Venues are added to the database."); })
    .error(function(err) { console.log(err); });

global.db.Agency.bulkCreate(agency_objects, Object)
    .success(function() { console.log("Agencies are added to the database."); })
    .error(function(err) { console.log(err); });

/*
   Define the routes for the app, i.e. the functions
   which are executed once specific URLs are encountered.

    example.com/ -> indexfn
    example.com/orders -> orderfn
    example.com/refresh_orders -> refresh_orderfn
    example.com/api/orders -> api_orderfn

   Specifically, in each case we get an HTTP request as a JS object
   ('request') and use it along with internal server variables to synthesize
   and return an HTTP response ('response'). In our simple example none of
   the features of the request are used aside from the path itself; in a
   more complex example you might want to return different results on the
   basis of the user's IP.

   The responses are generated by accessing the "Order" table in the local
   PostgreSQL database through the Sequelize ORM (specifically through
   model/order.js) and using the resulting Order instances to either
   populate server-side templates (via response.render), to trigger a
   redirect to another URL (via response.redirect), or to directly send data
   (via response.json or response.send).

   Note that to the maximum extent possible, these handler functions do not
   do heavy work on Order instances. We save that for the classMethods and
   instanceMethods defined in model/order.js. Instead, route handlers focus
   on the networking aspects of parsing the request and response, initiating
   the query to the database, and packaging it all up in a request.
*/
var indexfn = function(request, response) {
    response.render("homepage", {
	name: Constants.APP_NAME,
	title: "My First " + Constants.APP_NAME,
	product_name: Constants.PRODUCT_NAME,
	user: request.user,
	twitter_username: Constants.TWITTER_USERNAME,
	twitter_tweet: Constants.TWITTER_TWEET,
	product_short_description: Constants.PRODUCT_SHORT_DESCRIPTION,
	coinbase_preorder_data_code: Constants.COINBASE_PREORDER_DATA_CODE
    });
};

var aboutfn = function(request, response) {
    response.render("aboutpage", {
	name: Constants.APP_NAME,
	title: "About",
	user: request.user,
	product_name: Constants.PRODUCT_NAME
    });
};

var orderfn = function(request, response) {
    var successcb = function(orders_json) {
	response.render("orderpage", {
	    title: "Orders Chart",
	    user: request.user,
	    name: Constants.APP_NAME,
	    orders: orders_json
	});
    };
    var errcb = build_errfn('Error retrieving orders', response);
    global.db.Order.allToJSON(successcb, errcb);
};

var eventsfn = function(request, response) {
    response.render("eventspage", {
	title: "Events Chart",
	user: request.user,
	name: Constants.APP_NAME,
    });    
};

var agenciesfn = function(request, response) {
    var successcb = function(agencies_json) {
	response.render("agenciespage", {
	    title: "Promo Agencies",
	    user: request.user,
	    name: Constants.APP_NAME,
	    agencies: agencies_json
	});
    };
    var errcb = build_errfn('Error retrieving the list of agencies', response);
    global.db.Agency.allToJSON(successcb, errcb); 
};

var venuesfn = function(request, response) {
    var successcb = function(venues_json) {
	response.render("venuespage", {
	    title: "Venues & Clubs",
	    user: request.user,
	    name: Constants.APP_NAME,
	    venues: venues_json
	});
    };
    var errcb = build_errfn('Error retrieving the list of venues', response);
    global.db.Venue.allToJSON(successcb, errcb);   
};

var registerfn = function(request, response) {
    response.render("registerpage", {
	title: "User Registration",
	user: request.user,
	message: request.session.messages,
	name: Constants.APP_NAME});
};

var loginfn = function(request, response) {
    response.render("loginpage", {
	title: "User Login",
	user: request.user,
	message: request.session.messages,
	name: Constants.APP_NAME});
};

var contactfn = function(request, response) {
    response.render("contactpage", {
	title: "Contact",
	user: request.user,
	message: request.session.messages,
	name: Constants.APP_NAME});
};

var accountfn = function(request, response) {
    var cb = function(events_json, err) {
	if (err) { console.log(err); }
        response.render("accountpage", {
            title: "User Account",
            user: request.user,
            name: Constants.APP_NAME,
	    message: request.session.messages,
            events: events_json
        });
    };
    global.db.Event.allByUserIdToJSON(request.user.id, cb);
};

var api_eventfn = function(request, response) {
    var successcb = function(events_json) {
	var data = events_json;
	response.json(data);	
    };
    var errcb = build_errfn('Error retrieving API events', response);
    global.db.Event.allToJSON(successcb, errcb);
};

var api_orderfn = function(request, response) {
    var successcb = function(totals) {
	var data = uu.extend(totals,
			     {target: Constants.FUNDING_TARGET,
			      unit_symbol: Constants.FUNDING_UNIT_SYMBOL,
			      days_left: Constants.days_left()});
	data.total_funded *= Constants.FUNDING_SI_SCALE;
	response.json(data);
    };
    var errcb = build_errfn('Error retrieving API orders', response);
    global.db.Order.totals(successcb, errcb);
};

var refresh_orderfn = function(request, response) {
    var cb = function(err) {
	if(err) {
	    console.log("Error in refresh_orderfn");
	    response.send("Error refreshing orders.");
	} else {
	    response.redirect("/orders");
	}
    };
    global.db.Order.refreshFromCoinbase(cb);
};

/*
   Helper functions which create a ROUTES array for export and use by web.js

   Each element in the ROUTES array has two fields: path and fn,
   corresponding to the relative path (the resource asked for by the HTTP
   request) and the function executed when that resource is requested.

     [ { path: '/', fn: [Function] },
       { path: '/orders', fn: [Function] },
       { path: '/api/orders', fn: [Function] },
       { path: '/refresh_orders', fn: [Function] } ]

   It is certainly possible to implement define_routes with a simple for
   loop, but we use a few underscore methods (object, zip, map, pairs), just
   to familiarize you with the use of functional programming, which
   becomes more necessary when dealing with async programming.
*/
var define_routes = function(dict) {
    var toroute = function(item) {
	return uu.object(uu.zip(['path', 'fn'], [item[0], item[1]]));
    };
    return uu.map(uu.pairs(dict), toroute);
};

var ROUTES = define_routes({
    '/': indexfn,
    '/about': aboutfn,
    '/orders': orderfn,
    '/events': eventsfn,
    '/agencies': agenciesfn,
    '/venues': venuesfn,
    '/register': registerfn,
    '/login': loginfn,
    '/contact': contactfn,
    '/account': accountfn,
    '/api/orders': api_orderfn,
    '/api/events': api_eventfn,
    '/refresh_orders': refresh_orderfn
});

module.exports = ROUTES;
