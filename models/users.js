var async = require('async');
var util = require('util');
var uu = require('underscore');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define("User", {
	// username: {type: DataTypes.STRING, unique: true, allowNull: false},
	email: {type: DataTypes.STRING, unique: true, allowNull: false, validate: {isEmail: true}},
	// password: {type: DataTypes.STRING, allowNull: false},
	// firstName: {type: DataTypes.STRING, allowNull: false},
	// lastName: {type: DataTypes.STRING, allowNull: false},
	displayName: {type: DataTypes.STRING, allowNull: false},
	privilege: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0}
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
		    {where: 
		     { email: user.emails[0].value }
		    })
		    .success(function(user_instance) {
			
			if (user_instance) {
                            // already exists
			    var user_json = JSON.stringify(user_instance);
			    cb(user_json);
			} else {
                            var new_user_instance = _User.build({
				email: user.emails[0].value,
				displayName: user.displayName
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
 	    }
	},
	instanceMethods: {
	    repr: function() {
		return util.format(
		    "User <ID: %s Username: %s Email: %s Password: %s FirstName: %s LastName: %s DisplayName: %s Privilege: %s " +
			"Created: %s Updated:%s", this.id, this.username, this.email,
		    this.password, this.firstName, this.lastName, this.displayName, this.privilege, this.createdAt, this.updatedAt);
	    },
	    setPassword: function(password, done) {
		return bcrypt.genSalt(10, function(err, salt) {
		    return bcrypt.hash(password, salt, function(error, encrypted) {
			this.password = encrypted;
			this.salt = salt;
			return done();
		    });
		});
	    },
	    verifyPassword: function(password, done) {
		return bcrypt.compare(password, this.password, function(err, res) {
		    return done(err, res);
		});
	    }
	}
    });
};
