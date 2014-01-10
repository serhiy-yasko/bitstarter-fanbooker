var async = require('async');
var util = require('util');
var uu = require('underscore');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define("Performer", {
	name: {
	    type: DataTypes.STRING, 
	    unique: true, 
	    allowNull: false
	    //validate: {is: {args: ["[a-z ]",'i']}}
	},
	email: {
	    type: DataTypes.STRING, 
	    allowNull: true 
	    //validate: {isEmail: true}
	},
	address: {
	    type: DataTypes.STRING, 
	    allowNull: true
	},
	contactPerson: {
            type: DataTypes.STRING,
            allowNull: true
        },
	performerType: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
	paranoid: true,
	classMethods: {
	    numPerformers: function() {
		this.count().success(function(c) {
		    console.log("There are %s Performers", c);});
	    },
	    allToJSON: function(successcb, errcb) {
                this.findAll()
                 .success(function(performers) {
                        successcb(uu.invoke(performers, 'toJSON'));
                 })
                 .error(errcb);
            },
	    addAllFromJSON: function(performers, errcb) {
                var MAX_CONCURRENT_POSTGRES_QUERIES = 1;
                async.eachLimit(performers,
                                MAX_CONCURRENT_POSTGRES_QUERIES,
                                this.addPerformer.bind(this), errcb);
            },
            addPerformer: function(performer_obj, cb) {
		var performer = performer_obj;
                var _Performer = this;
               	
		_Performer.find(
		    { where: 
		      { name: performer.name }
		    })
		    .success(function(performer_instance) {
			if (performer_instance) {
                            // already exists
			    var performer_json = JSON.stringify(performer_instance);
			    cb(performer_json);
			} else {			    			    
                            var new_performer_instance = _Performer.build({
				name: performer.name,
				email: performer.email,
				address: performer.address,
				contactPerson: performer.contactPerson,
				performerType: performer.performerType
			    });
			    new_performer_instance.save()
				.success(function() {
				    var performer_json = JSON.stringify(new_performer_instance);
				    cb(performer_json);
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
		    "Performer <ID: %s Name: %s Email: %s Address: %s ContactPerson: %s PerformerType: %s " +
			"Created: %s Updated:%s", this.id, this.name, this.email,
		    this.address, this.contactPerson, this.performerType, this.createdAt, this.updatedAt);
	    }
	}
    });
};
