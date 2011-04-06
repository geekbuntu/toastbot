var fs = require('fs');
var irc = require('irc');
var path = require('path');


var zero_pad = function(value, width) {
  var adjusted = value.toString();
  var width = width || 2;
  
  while(adjusted.length < width) {
    adjusted = '0'+adjusted;
  }
  
  return adjusted;
}


var Toastbot = function(options) {
  var self = this;
  options = options || {};
  
  self.server = options.server || 'irc.freenode.net';
  self.nick = options.nick || 'toastbot';
  self.username = options.username || 'toastbot';
  self.realname = options.realname || 'ToastBot';
  self.debug = options.debug || false;
  self.channel = options.channel || '#toastdriven';
  self.client = null;
  self.log_dir = path.join(path.dirname(__filename), 'logs');
  
  self.handlers = options.handlers || ['help'];
  self.variants = options.variants || [
    self.nick+': ',
    self.nick+', ',
    self.nick+'- ',
    self.nick+' - '
  ];
};

Toastbot.prototype.setup = function() {
  var self = this;
  self.ensure_log_directory();
  
  self.client = new irc.Client(self.server, self.nick, {
    userName: self.username,
    realName: self.realname,
    debug: self.debug,
    channels: [self.channel]
  });
  
  self.client.on('join'+self.channel, function() {
    self.log('Joined '+self.channel);
  });
  self.client.on('message'+self.channel, function(nick, text) {
    self.handle_message(nick, text);
  });
  self.client.on('pm', function(nick, text) {
    self.handle_pm(nick, text);
  });
  self.client.on('error', function(raw_message) {
    console.log(raw_message.command);
  });
};

Toastbot.prototype.ensure_log_directory = function() {
  var self = this;
  
  fs.mkdir(self.log_dir, '0777', function() {
    if(self.debug == true) {
      self.log('Ensured the log directory exists.');
    }
  });
};

Toastbot.prototype.get_date = function() {
  var today = new Date();
  return {
    today: today,
    year: today.getFullYear(),
    month: zero_pad(today.getMonth()),
    day: zero_pad(today.getDate()),
    hour: zero_pad(today.getHours()),
    minute: zero_pad(today.getMinutes()),
    second: zero_pad(today.getSeconds())
  };
};

Toastbot.prototype.log = function(message) {
  var self = this;
  var date = self.get_date();
  
  var log_filename = '' + date.year + date.month + date.day + '.log';
  var log_filepath = path.join(self.log_dir, log_filename);
  
  fs.open(log_filepath, 'a', function(err, fd) {
    if(err) {
      console.log(err.toString());
      return;
    }
    
    var entry = '['+date.year+'-'+date.month+'-'+date.day+' '+date.hour+':'+date.minute+':'+date.second+'] ' + message+'\n';
    fs.write(fd, entry, function(err, written, buffer) {
      if(err) {
        console.log(err.toString());
      }
      fs.close(fd);
    });
  });
};

Toastbot.prototype.clean_message = function(text) {
  var clean_text = text.trim();
  // Strip off crazy chars on actions.
  clean_text = clean_text.replace(/\u0001/g, '');
  return clean_text;
}

Toastbot.prototype.said_to_me = function(text) {
  var self = this;
  
  for(var offset in self.variants) {
    if(text.indexOf(self.variants[offset]) == 0) {
      return ['direct', text.replace(self.variants[offset], '').trim()];
    }
    else if(text.indexOf(self.variants[offset]) > 0) {
      return ['indirect', text];
    }
    else {
      return null;
    }
  }
};

Toastbot.prototype.is_direct_command = function(name, text) {
  var self = this;
  var to_me = self.said_to_me(text);
  
  if(to_me[0] != 'direct') {
    return null;
  }
  
  // Use the modified text.
  text = to_me[1];
  
  if(text.toLowerCase() != name) {
    return null;
  }
  
  return text;
};

Toastbot.prototype.help = function(nick, text) {
  var self = this;
  var text = self.is_direct_command('help', text);
  
  if(! text) {
    return null;
  }
  
  var commands = [
    nick+": Valid commands -"
  ];
  
  for(var offset in self.handlers) {
    var command = "   "+self.handlers[offset];
    
    if(self[self.handlers[offset]].hasOwnProperty('__doc__') == true) {
      command += " = "+self[self.handlers[offset]].__doc__;
    }
    else {
      command += " = No documentation.";
    }
    
    commands.push(command);
  }
  
  return commands;
};
Toastbot.prototype.help.__doc__ = "Provides a description of what I respond to.";

Toastbot.prototype.handle_message = function(nick, text) {
  var self = this;
  var clean_text = self.clean_message(text);
  
  if(clean_text.substr(0, 6) == 'ACTION') {
    self.log('* '+nick+' '+clean_text.substr(5));
  }
  else {
    self.log(nick+": "+clean_text);
  }
  
  // Run the message through the handlers.
  for(var offset in self.handlers) {
    var response = self[self.handlers[offset]](nick, clean_text);
    
    if(response != null) {
      if(!response instanceof Array) {
        response = [response];
      }
      for(var roffset in response) {
        self.log(self.nick+': '+response[roffset]);
        self.client.say(self.channel, response[roffset]);
      }
    }
  }
};

Toastbot.prototype.handle_pm = function(nick, text) {
  var self = this;
  var clean_text = self.clean_message(text);
  self.log("PM <- "+nick+": "+clean_text);
  var message = "Sorry, I don't respond to PMs yet.";
  self.client.say(nick, message);
  self.log("PM -> "+nick+": "+message);
};

exports.Toastbot = Toastbot;


// ==============================================
// Handlers!
// ==============================================


Toastbot.prototype.dance = function(nick, text) {
  var self = this;
  var text = self.is_direct_command('dance', text);
  
  if(! text) {
    return null;
  }
  
  var sweet_moves = [
    "_O_",
    "\\O_",
    "_O/",
    "\\O/",
  ];
  
  return sweet_moves;
};
Toastbot.prototype.dance.__doc__ = "Get down and funky.";
