var fs      = require('fs'),
	request = require('request'),
	utils   = require('../util/utils.js');

var VoiceAnnouncer = function(client, config) {
	var self = this;
	self.client = client;
	self.config = config;
	self.servers = [];
	fs.readFile('../data/voice/.servers', 'utf-8', function(err, data) {
		if(data) {
			self.servers = JSON.parse(data);
		}
	});
	self.queue = new Array();
	self.playing = false;
	pulse(self);
};

VoiceAnnouncer.prototype.on = function(message, callback) {
	var perms = message.channel.permissionsOf(message.author);
	if(perms.hasPermission('manageServer') || this.config.su.indexOf(message.author.id) !== -1) {
		if(this.servers.indexOf(message.channel.server.id) < 0) {
			this.servers.push(message.channel.server.id);
			fs.writeFile('../data/voice/.servers', JSON.stringify(this.servers, null, 2), function() {
				callback('Voice announce is on!');
			});
		} else {
			callback('Voice announce is on!');
		}
	} else {
		callback('You don\'t have permission to do that!');	
	}
};

VoiceAnnouncer.prototype.off = function(message, callback) {
	var perms = message.channel.permissionsOf(message.author);
	if(perms.hasPermission('manageServer') || this.config.su.indexOf(message.author.id) !== -1) {
		var index = this.servers.indexOf(message.channel.server.id);
		if (index !== -1) {
			this.servers.splice(index, 1);
			fs.writeFile('../data/voice/.servers', JSON.stringify(this.servers, null, 2), function() {
				callback('Voice announce is off!');
			});
		} else {
			callback('Voice announce is off!');
		}
	} else {
		callback('You don\'t have permission to do that!');	
	}
};

VoiceAnnouncer.prototype.joined = function(channel, user) {
	if(channel.members.length < 1) return;
	var self = this;
	if(self.servers.indexOf(channel.server.id) >= 0) {
		var path = '../data/voice/' + user.id + '.joined.wav';
		fs.exists(path, function(exists) {
			if(!exists) {
				self.createTTSFile(utils.filterName(user.name) + ' has joined.', path, function() {
					self.queue.push({'channel': channel, 'path': path});
				});
			} else {
				self.queue.push({'channel': channel, 'path': path});
			}
		});
	}
};

VoiceAnnouncer.prototype.left = function(channel, user) {
	if(channel.members.length < 1) return;
	var self = this;
	if(self.servers.indexOf(channel.server.id) >= 0) {
		var path = '../data/voice/' + user.id + '.left.wav';
		fs.exists(path, function(exists) {
			if(!exists) {
				self.createTTSFile(utils.filterName(user.name) + ' has left.', path, function() {
					self.queue.push({'channel': channel, 'path': path});
				});
			} else {
				self.queue.push({'channel': channel, 'path': path});
			}
		});
	}
};

VoiceAnnouncer.prototype.play = function(item) {
	var self = this;
	self.client.joinVoiceChannel(item.channel, function(e, vc) {
		var stream = fs.createReadStream(item.path);
		vc.on('error', function(e) {
			console.log(e);
		});
		vc.playStream(stream).on('end', function() {
			if(self.queue.length > 0) {
				self.play(self.queue.shift());
			} else {
				self.client.leaveVoiceChannel(item.channel, function() {
					self.playing = false;
					pulse(self);
				});
			}
		}).on('error', function(e) {
			console.log(e);
		});
	});
};

VoiceAnnouncer.prototype.createTTSFile = function(message, path, callback) {
	var url = 'http://api.voicerss.org/?key=';
	url += this.config.ttsKey;
	url += '&src=';
	url += message;
	url += '&hl=en-us&c=wav&f=44khz_16bit_stereo';
	var req = request.get(url, {'timeout': 3000});
	req.on('response', function(resp) {
		if(resp.statusCode === 200) {
			var stream = req.pipe(fs.createWriteStream(path));
			stream.on('finish', callback);
			stream.on('error', function(err) {
				console.log(err);
			});
		} else {
			console.log('tts failed on ' + message);
		}
	}).on('error', function(err) {
		console.log(err);
	});
};

var pulse = function(self) {
	if(!self.playing && self.queue.length > 0) {
		self.playing = true;
		var item = self.queue.shift();
		self.play(item);
	} else {
		setTimeout(function() {
			pulse(self);
		}, 10);
	}
};

module.exports = VoiceAnnouncer;