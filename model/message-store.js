var fs     = require('fs'),
	moment = require('moment');

var MessageStore = function() {
	var self = this;
	self.users = [];
	fs.readFile('../data/.users', 'utf-8', function(err, data) {
		if(data) {
			self.users = JSON.parse(data);
		}
	});
};

MessageStore.prototype.on = function(user, callback) {
	if(this.users.indexOf(user.id) < 0) {
		this.users.push(user.id);
		fs.writeFile('../data/.users', JSON.stringify(this.users, null, 2), callback);
	} else {
		callback();
	}
};

MessageStore.prototype.off = function(user, callback) {
	var index = this.users.indexOf(user.id);
	if (index !== -1) {
		this.users.splice(index, 1);
		fs.writeFile('../data/.users', JSON.stringify(this.users, null, 2), callback);
	} else {
		callback();
	}
};

MessageStore.prototype.store = function(message) {
	var self = this;
	if(message.everyoneMentioned) {
		message.channel.server.members.forEach(function(user) {
			if(self.users.indexOf(user.id) >= 0) {
				var perms = message.channel.permissionsOf(user);
				if(perms.hasPermission('readMessages')) {
					appendMessage(user.id, message.timestamp, message.author.username, message.content);	
				}
			}
		});
	} else if(message.mentions) {
		message.mentions.forEach(function(user) {
			if(self.users.indexOf(user.id) >= 0) {
				if(message.channel && message.channel.permissionsOf) {
					var perms = message.channel.permissionsOf(user);
					if(perms.hasPermission('readMessages')) {
						appendMessage(user.id, message.timestamp, message.author.username, message.content);
					}
				}
			}
		});
	}
};

MessageStore.prototype.retrieve = function(userid, callback) {
	var self = this;
	if(self.users.indexOf(userid) >= 0) {
		fs.readFile('../data/' + userid, 'utf-8', function(err, data) {
			if(!err && data && data.length > 0) {
				callback('I have seen the following messages:\n' + data, function() {
					fs.truncate('../data/' + userid, 0);
				});
			} else {
				callback('Sorry! No new messages.');
			}
		});
	} else {
		callback('I am not recording messages for you.');
	}
};

var appendMessage = function(userid, timestamp, author, content) {
	var message = moment(timestamp).format('MMMM Do, h:mm:ss a') + ' > ' + author + ' said ' + content + '\n';
	fs.appendFile('../data/' + userid, message);
};

module.exports = MessageStore;