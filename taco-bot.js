var fs           = require('fs'),
    moment       = require('moment'),
    Discord      = require('discord.js'),
    MessageStore = require('./model/message-store.js')
    config       = require('./config.json');

var client = new Discord.Client();
var messages = new MessageStore();

client.on('message', function(m) {
	if(m.content.startsWith("!taco what")) {
		log('Announcing', m.author);
		staticContent(m.channel,'static/announce.md');
	} else if(m.content.startsWith("!taco help")) {
		log('Helping', m.author);
		staticContent(m.author,'static/help.md');
	} else if(m.content.startsWith("!taco on")) {
		log('On', m.author);
		messages.on(m.author, function() {
			client.sendMessage(m.author, 'I am recording messages that mention you.');
		});
	} else if(m.content.startsWith("!taco off")) {
		log('Off', m.author);
		messages.off(m.author, function() {
			client.sendMessage(m.author, 'I am not recording messages that mention you.');
		});
	} else if(m.content.startsWith('!taco me')) {
		log('Retrieving', m.author);
		messages.retrieve(m.author.id, function(messages, callback) {
			client.sendMessage(m.author, messages, callback);
		});
	} else {
		messages.store(m);
	}
});

client.on('disconnected', function () {
    log('Reconnecting');
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
	});
};

connect();
