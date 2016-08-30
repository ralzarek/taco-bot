var fs             = require('fs'),
    moment         = require('moment'),
    Discord        = require('discord.js'),
    VoiceAnnouncer = require('./voice-announcer.js'),
    config         = require('./config.json');

var client = new Discord.Client();
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
	//is the bot the author?
	if(m.author.id == client.user.id) {
		return;
	}

	//is the channel a server channel?
	if(!(m.channel instanceof Discord.ServerChannel)) {
		client.sendMessage(m.channel, 'You can\'t do that in a PM!');
		return;
	}

	//ignore non-commands
	if(!m.content.startsWith('!taco')) {
		return;
	}

	//is the message author an admin?
	var perms = m.channel.permissionsOf(m.author);
	if(!(perms.hasPermission('manageServer') || config.su.indexOf(m.author.id) !== -1)) {
		client.sendMessage(m.channel, 'You don\'t have permission to do that!');
		return;
	}

	//turn on for server
	if(m.content.startsWith('!taco on')) {
		log('On', m.author);
		announcer.on(m.channel.server.id, function(result) {
			client.sendMessage(m.channel, result);
		});
		return;
	} 

	//turn off for server
	if(m.content.startsWith('!taco off')) {
		log('Off', m.author);
		announcer.off(m.channel.server.id, function(result) {
			client.sendMessage(m.channel, result);
		});
		return;
	}

	//check status for server
	if(m.content.startsWith('!taco status')) {
		log('Status', m.author);
		announcer.status(m.channel.server.id, function(result) {
			client.sendMessage(m.channel, result);
		});
		return;
	}

	//get help server
	if(m.content.startsWith('!taco help')) {
		log('Help', m.author);
		staticContent(m.channel, 'help.md');
		return;
	}

	//i dunno
	if(m.content.startsWith('!taco')) {
		log('Unkown', m.author);
		client.sendMessage(m.channel, 'I don\'t know how to do that!');
	}
});

client.on('disconnected', function () {
	log('Reconnecting');
    ready = false;
    setTimeout(function() {
    	connect();
    }, 1000);
});

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

var staticContent = function(channel, asset) {
	fs.readFile(asset, 'utf-8', function(err, data) {
		if(err) {
			client.sendMessage(channel, 'Something went wrong!');
		} else {
			client.sendMessage(channel, data);
		}
	});
};

connect();