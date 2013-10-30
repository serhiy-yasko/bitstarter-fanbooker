/*
   Object/Relational mapping for instances of the User class.

    - classes correspond to tables
    - instances correspond to rows
    - fields correspond to columns

   In other words, this code defines how a row in the PostgreSQL "User"
   table maps to the JS User object. Note that we've omitted a fair bit of
   error handling from the classMethods and instanceMethods for simplicity.
*/
var async = require('async');
var util = require('util');
var uu = require('underscore');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define("User", {
	username: {type: DataTypes.STRING, unique: true, allowNull: false},
	email: {type: DataTypes.STRING, unique: true, allowNull: false, validate: {isEmail: true}},
	password: {type: DataTypes.STRING, allowNull: false},
	firstName: {type: DataTypes.STRING, allowNull: false},
	lastName: {type: DataTypes.STRING, allowNull: false},
	privilege: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0}
    }, {
	paranoid: true,
	classMethods: {
	    numUsers: function() {
		this.count().success(function(c) {
		    console.log("There are %s Users", c);});
	    }
	},
	instanceMethods: {
	    repr: function() {
		return util.format(
		    "User <ID: %s Username: %s Email: %s Password: %s FirstName: %s LastName: %s Privilege: %s " +
			"Created: %s Updated:%s", this.id, this.username, this.email,
		    this.password, this.firstName, this.lastName, this.privilege, this.createdAt, this.updatedAt);
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
