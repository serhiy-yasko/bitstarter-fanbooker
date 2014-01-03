var async = require('async');
var util = require('util');
var uu = require('underscore');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define("Event", {
	performer: {
	    type: DataTypes.STRING, 
	    unique: true, 
	    allowNull: false,
	    validate: {is: {args: ["[a-z ]",'i'], message: "Please only use letters"}}
	},
	city: {
	    type: DataTypes.STRING, 
	    allowNull: false, 
	    validate: {isAlpha: {args: true, message: "Please state a city the event should take place in"}}
	},
	venue: {
	    type: DataTypes.STRING, 
	    allowNull: true 
	},
	agency: {
            type: DataTypes.STRING,
            allowNull: true
        },
	date: {
            type: DataTypes.STRING,
            allowNull: true
        },
	comment: {
	    type: DataTypes.TEXT, 
	    allowNull: true
	}
    }, {
	paranoid: true,
	classMethods: {
	    numEvents: function() {
		this.count().success(function(c) {
		    console.log("There are %s Events", c);});
	    },
	    allToJSON: function(successcb, errcb) {
                this.findAll()
                 .success(function(events) {
                        successcb(uu.invoke(events, 'toJSON'));
                 })
                 .error(errcb);
            },
	    addAllFromJSON: function(events, errcb) {
                var MAX_CONCURRENT_POSTGRES_QUERIES = 1;
                async.eachLimit(events,
                                MAX_CONCURRENT_POSTGRES_QUERIES,
                                this.addEvent.bind(this), errcb);
            },
            addEvent: function(event_obj, cb) {
		var event = event_obj;
                var _Event = this;
               
		_Event.find(
		    { where: 
		      { performer: event.performer,
			city: event.city }
		    })
		    .success(function(event_instance) {
			
			if (event_instance) {
                            // already exists
			    var event_json = JSON.stringify(event_instance);
			    cb(event_json);
			} else {			    	    
                            var new_event_instance = _Event.build({
				performer: event.performer,
				city: event.city,
				comment: event.comment
                            });
			    
                            new_event_instance.save()
				.success(function() {
				    var event_json = JSON.stringify(new_event_instance);
				    cb(event_json);
				})
				.error(function(err) {
				    cb(err);
				});
			}
                    });
 	    },
	    findEventByPerformer: function(event_performer, cb) {
                var _Event = this;
                _Event.find(
                    { where:
                      { performer: event_performer }
                    })
                    .success(function(event_instance) {
                        if (event_instance) {
                            // already exists
                            var event_json = JSON.stringify(event_instance);
                            cb(event_json);
                        }
                    })
                    .error(function(err) {
                        cb(err);
                    });
            },
            findEventByCity: function(event_city, cb) {
                var _Event = this;
                _Event.find(
                    { where:
                      { city: event_city }
                    })
                    .success(function(event_instance) {
                        if (event_instance) {
                            // already exists
                            var event_json = JSON.stringify(event_instance);
                            cb(event_json);
                        }
                    })
                    .error(function(err) {
                        cb(err);
                    });
            }
	},
	instanceMethods: {
	    repr: function() {
		return util.format(
		    "Event <ID: %s Performer: %s City: %s Venue: %s Agency: %s Date: %s Comment: %s", 
		    this.id, this.performer, this.city, this.venue, this.agency, this.date, this.comment);
	    }
	}
    });
};
