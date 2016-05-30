var fs             = require('fs'),
    moment         = require('moment'),
    Discord        = require('discord.js'),
    MessageStore   = require('./model/message-store.js'),
    VoiceAnnouncer = require('./model/voice-announcer.js'),
    utils          = require('./util/utils.js'),
    config         = require('./config.json');

var client = new Discord.Client();
var messages = new MessageStore();
var announcer = new VoiceAnnouncer(client, config);
var ready = false;

client.on('voiceJoin', function(channel, user) {
	if(ready && user.id != client.user.id) {
		announcer.joined(channel, user);
	}
});

client.on('voiceLeave', function(channel, user) {
	if(ready && user.id != client.user.id) {
		announcer.left(channel, user);
	}
});

client.on('message', function(m) {
	if(m.content.startsWith('!taco what')) {
		log('What', m.author);
		staticContent(m.channel,'static/announce.md');
	} else if(m.content.startsWith('!taco help')) {
		log('Help', m.author);
		staticContent(m.author,'static/help.md');
	} else if(m.content.startsWith('!taco on')) {
		log('On', m.author);
		messages.on(m.author, function() {
			client.sendMessage(m.author, 'I am recording messages that mention you.');
		});
	} else if(m.content.startsWith('!taco off')) {
		log('Off', m.author);
		messages.off(m.author, function() {
			client.sendMessage(m.author, 'I am not recording messages that mention you.');
		});
	} else if(m.content.startsWith('!taco me')) {
		log('Retrieve', m.author);
		messages.retrieve(m.author.id, function(messages, callback) {
			client.sendMessage(m.author, messages, callback);
		});
	} else if(m.content.startsWith('!taco voice on')) {
		log('Voice on', m.author);
		if(m.channel instanceof Discord.ServerChannel) {
			announcer.on(m, function(result) {
				client.sendMessage(m.channel, result);
			});
		} else {
			client.sendMessage(m.channel, 'You can\'t do that in a PM!');
		}
	} else if(m.content.startsWith('!taco voice off')) {
		log('Voice off', m.author);
		if(m.channel instanceof Discord.ServerChannel) {
			announcer.off(m, function(result) {
				client.sendMessage(m.channel, result);
			});
		} else {
			client.sendMessage(m.channel, 'You can\'t do that in a PM!');
		}
	} else if(m.content.startsWith('!taco say')) {
		if(config.su.indexOf(m.author.id) !== -1) {
			var content = m.content.replace('!taco say ', '');
			var channel = null;
			if(content.startsWith('to')) {
				content = content.substr(content.indexOf(' ') + 1);
				var name = content.split(' ')[0];
				content = content.substr(content.indexOf(' ') + 1);
				channel = findUser(name);
			} else if(content.startsWith('in')) {
				content = content.substr(content.indexOf(' ') + 1);
				var name = content.split(' ')[0];
				content = content.substr(content.indexOf(' ') + 1);
				channel = findChannel(name);
			} else {
				channel = m.channel;
			}
			if(channel != null) {
				client.sendMessage(channel, content);
			} else {
				client.sendMessage(m.channel, 'I couldn\'t figure out where you wanted me to say that!');	
			}
		} else {
			client.sendMessage(m.channel, 'You don\'t have permission to do that!');
		}
	} else if(m.content.startsWith('!taco')) {
		log('Unkown', m.author);
		staticContent(m.channel,'static/unknown.md');
	} else if(m.channel instanceof Discord.PMChannel && m.author.id != client.user.id) {
		log('PM ' + m.content, m.author);
		config.su.forEach(function(id) {
			if(id != m.author.id) {
				client.sendMessage(id, m.author.name + ' says ' + m.content);
			}
		});
	} else {
		messages.store(m);
	}
});

client.on('disconnected', function () {
    log('Reconnecting');
    ready = false;
    connect();
});

var staticContent = function(channel, asset) {
	fs.readFile(asset, 'utf-8', function(err, data) {
		if(!err) {
			client.sendMessage(channel, data);
		} else {
			client.sendMessage(channel, 'Something went wrong!');
		}
	});
};

var log = function(info, user) {
	var buf = moment().format('MM-DD-YYYY HH:mm:ss') + ' ' + info;
	if(user) {
		buf += ' ' + user.username + ' (' + user.id + ')';
	}
	buf += '.';
	console.log(buf);
};

var connect = function() {
	client.loginWithToken(config.token, function() {
		log('Connected');
		setTimeout(function() {
			ready = true;
		}, 1000);
	});
};

var findUser = function(name) {
	var result = null;
	name = name.toLowerCase();
	client.users.forEach(function(user) {
		if(utils.filterName(user.name).toLowerCase().startsWith(name)) {
			result = user;
		}
	});
	return result;
};

var findChannel = function(name) {
	var result = null;
	name = name.toLowerCase();
	client.channels.forEach(function(channel) {
		if(channel.name.startsWith(name)) {
			result = channel;
		}
	});
	return result;
};

connect();