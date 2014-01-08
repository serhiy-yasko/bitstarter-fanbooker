var async = require('async');
var util = require('util');
var uu = require('underscore');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define("Agency", {
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
        }
    }, {
	paranoid: true,
	classMethods: {
	    numAgencies: function() {
		this.count().success(function(c) {
		    console.log("There are %s Agencies", c); 
		});
	    },
	    allToJSON: function(successcb, errcb) {
                this.findAll({order: 'name ASC'})
                 .success(function(agencies) {
                        successcb(uu.invoke(agencies, 'toJSON'));
                 })
                 .error(errcb);
            },
	    addAllFromJSON: function(agencies, errcb) {
                var MAX_CONCURRENT_POSTGRES_QUERIES = 1;
                async.eachLimit(agencies,
                                MAX_CONCURRENT_POSTGRES_QUERIES,
                                this.addAgency.bind(this), errcb);
            },
            addAgency: function(agency_obj, cb) {
		var agency = agency_obj;
                var _Agency = this;
               	_Agency.find(
		    { where: 
		      { name: agency.name }
		    })
		    .success(function(agency_instance) {
			if (agency_instance) {
                            // already exists
			    var agency_json = JSON.stringify(agency_instance);
			    cb(agency_json);
			} else {
			    var new_agency_instance = _Agency.build({
				name: agency.name,
				address: agency.address,
				phone: agency.phone,
				website: agency.website,
				email: agency.email,
				contactPerson: agency.contactPerson
			    });
			    new_agency_instance.save()
				.success(function() {
				    var agency_json = JSON.stringify(new_agency_instance);
				    cb(agency_json);
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
		    "Agency <ID: %s Name: %s Address: %s Phone: %s Website: %s Email: %s ContactPerson: %s " +
			"Created: %s Updated:%s", this.id, this.name, this.address,
		    this.phone, this.website, this.email, this.contactPerson, this.createdAt, this.updatedAt);
	    }
	}
    });
};
