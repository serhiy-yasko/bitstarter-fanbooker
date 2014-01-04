var async = require('async');
var util = require('util');
var uu = require('underscore');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define("User", {
	username: {
	    type: DataTypes.STRING, 
	    unique: true, 
	    allowNull: false,
	    validate: {is: {args: ["[a-z0-9_]",'i'], message: "Please only use letters, numbers and underscores"}}
	},
	email: {
	    type: DataTypes.STRING, 
	    unique: true, 
	    allowNull: false, 
	    validate: {isEmail: {args: true, message: "Please provide your actual email"}}
	},
	password: {
	    type: DataTypes.STRING, 
	    allowNull: false
	},
	firstName: {
	    type: DataTypes.STRING, 
	    allowNull: false,
	    validate: {isAlpha: {args: true, message: "Please state your real first name"}}
	},
	lastName: {
	    type: DataTypes.STRING, 
	    allowNull: false,
	    validate: {isAlpha: {args: true, message: "Please state your real last name"}}
	},
	displayName: {
	    type: DataTypes.STRING, 
	    allowNull: true,
	    validate: {isAlpha: {args: true, message: "Please only use letters"}}
	},
	privilege: {
	    type: DataTypes.INTEGER, 
	    allowNull: false, 
	    defaultValue: 0
	}
    }, {
	paranoid: true,
	classMethods: {
	    numUsers: function() {
		this.count().success(function(c) {
		    console.log("There are %s Users", c);});
	    },
	    allToJSON: function(successcb, errcb) {
                this.findAll()
                 .success(function(users) {
                        successcb(uu.invoke(users, 'toJSON'));
                 })
                 .error(errcb);
            },
	    addAllFromJSON: function(users, errcb) {
                var MAX_CONCURRENT_POSTGRES_QUERIES = 1;
                async.eachLimit(users,
                                MAX_CONCURRENT_POSTGRES_QUERIES,
                                this.addUserAccount.bind(this), errcb);
            },
            addUserAccount: function(user_obj, cb) {
		var user = user_obj;
                var _User = this;
               
		/*
		_User.findOrCreate(
		    { email: user.emails[0].value },
		    { displayName: user.displayName })
		.success(function(user_instance, created) {
		    console.log(user_instance.values),
		    console.log(created)		    
		})
		.error(function(err) {
		    cb(err);
		});
		*/

		_User.find(
		    { where: 
		      { email: user.email }
		    })
		    .success(function(user_instance) {
			
			if (user_instance) {
                            // already exists
			    var user_json = JSON.stringify(user_instance);
			    cb(user_json);
			} else {
			    			    
                            var new_user_instance = _User.build({
				username: user.username,
				email: user.email,
				password: user.password,
				firstName: user.firstname,
				lastName: user.lastname,
				displayName: user.username,
				privilege: 1
			    });
			    
                            new_user_instance.save()
				.success(function() {
				    var user_json = JSON.stringify(new_user_instance);
				    cb(user_json);
				})
				.error(function(err) {
				    cb(err);
				});
			}
                    });
 	    },
	    findAccountByEmail: function(user_email, cb) {
                var _User = this;
		_User.find(
                    { where:
                      { email: user_email }
                    })
                    .success(function(user_instance) {
                        if (user_instance) {
                            // already exists
                            var user_json = JSON.stringify(user_instance);
                            cb(user_json);
			}
		    })
		    .error(function(err) {
			cb(err);
		    });
	    },
	    findAccountById: function(user_id, cb) {
                var _User = this;
                _User.find(
                    { where:
                      { id: user_id }
                    })
                    .success(function(user_instance) {
                        if (user_instance) {
                            // already exists
                            var user_json = JSON.stringify(user_instance);
                            cb(user_json);
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
		    "User <ID: %s Username: %s Email: %s Password: %s FirstName: %s LastName: %s DisplayName: %s Privilege: %s " +
			"Created: %s Updated:%s", this.id, this.username, this.email,
		    this.password, this.firstName, this.lastName, this.displayName, this.privilege, this.createdAt, this.updatedAt);
	    }
	}
    });
};
