var fs      = require('fs'),
	request = require('request');

var VoiceAnnouncer = function(client, ttsKey) {
	this.client = client;
	this.ttsKey = ttsKey;
	this.queue = new Array();
	this.playing = false;	
	pulse(this);
};

VoiceAnnouncer.prototype.joined = function(channel, user) {
	var self = this;
	var path = '../data/sounds/' + user.id + '.joined.wav';
	fs.exists(path, function(exists) {
		if(!exists) {
			self.createTTSFile(filterName(user.name) + ' has joined.', path, function() {
				self.queue.push({'channel': channel, 'path': path});
			});
		} else {
			self.queue.push({'channel': channel, 'path': path});
		}
	});
};

VoiceAnnouncer.prototype.left = function(channel, user) {
	var self = this;
	var path = '../data/sounds/' + user.id + '.left.wav';
	fs.exists(path, function(exists) {
		if(!exists) {
			self.createTTSFile(filterName(user.name) + ' has left.', path, function() {
				self.queue.push({'channel': channel, 'path': path});
			});
		} else {
			self.queue.push({'channel': channel, 'path': path});
		}
	});
};

VoiceAnnouncer.prototype.play = function(item) {
	var self = this;
	self.client.joinVoiceChannel(item.channel, function(e, vc) {
		var stream = fs.createReadStream(item.path);
		vc.playStream(stream).on('end', function() {
			if(self.queue.length > 0) {
				self.play(self.queue.shift());
			} else {
				self.client.leaveVoiceChannel(item.channel, function() {
					self.playing = false;
					pulse(self);
				});
			}
		});
	});
};

VoiceAnnouncer.prototype.createTTSFile = function(message, path, callback) {
	var url = 'http://api.voicerss.org/?key=';
	url += this.ttsKey;
	url += '&src=';
	url += message;
	url += '&hl=en-us&c=wav&f=44khz_16bit_stereo';
	var stream = request.get(url).pipe(fs.createWriteStream(path));
	stream.on('finish', callback);
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

var filterName = function(name) {
	name = name.replace(/:.*:/, '');
	return name;
};

module.exports = VoiceAnnouncer;