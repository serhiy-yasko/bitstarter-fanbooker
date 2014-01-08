var async = require('async');
var util = require('util');
var uu = require('underscore');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define("Venue", {
	name: {
	    type: DataTypes.STRING, 
	    allowNull: false
	},
	address: {
            type: DataTypes.STRING,
            allowNull: true
        },
	phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
	website: {
            type: DataTypes.STRING,
            allowNull: true
        },
	email: {
	    type: DataTypes.STRING, 
	    allowNull: true 
	},
	contactPerson: {
	    type: DataTypes.STRING, 
	    allowNull: true
	},
	venueType: {
            type: DataTypes.STRING,
            allowNull: true
        },
	volume: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
	paranoid: true,
	classMethods: {
	    numVenues: function() {
		this.count().success(function(c) {
		    console.log("There are %s Venues", c);});
	    },
	    allToJSON: function(successcb, errcb) {
                this.findAll({order: 'name ASC'})
                 .success(function(venues) {
                     successcb(uu.invoke(venues, 'toJSON'));
                 })
                 .error(errcb);
            },
	    addAllFromJSON: function(venues, errcb) {
                var MAX_CONCURRENT_POSTGRES_QUERIES = 1;
                async.eachLimit(venues,
                                MAX_CONCURRENT_POSTGRES_QUERIES,
                                this.addVenue.bind(this), errcb);
            },
            addVenue: function(venue_obj, cb) {
		var venue = venue_obj;
                var _Venue = this;
               	_Venue.find(
		    { where: 
		      { name: venue.name }
		    })
		    .success(function(venue_instance) {
			if (venue_instance) {
                            // already exists
			    var venue_json = JSON.stringify(venue_instance);
			    cb(venue_json);
			} else {
			    var new_venue_instance = _Venue.build({
				name: venue.name,
				address: venue.address,
				phone: venue.phone,
				website: venue.website,
				email: venue.email,
				contactPerson: venue.contactPerson,
				venueType: venue.venueType,
				volume: venue.volume
                            });
			    new_venue_instance.save()
				.success(function() {
				    var venue_json = JSON.stringify(new_venue_instance);
				    cb(venue_json);
				})
				.error(function(err) {
				    cb(err);
				});
			}
                    });
 	    }
	},
	instanceMethods: {
	    repr: function() {
		return util.format(
		    "Venue <ID: %s Name: %s Address: %s Phone: %s Website: %s Email: %s ContactPerson: %s VenueType: %s Volume: %s " +
			"Created: %s Updated:%s", this.id, this.name, this.address,
		    this.phone, this.website, this.email, this.contactPerson, this.venueType, this.volume, this.createdAt, this.updatedAt);
	    }
	}
    });
};
