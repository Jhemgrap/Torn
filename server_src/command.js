class Command {
    constructor(usage, permissions, invoke, visible=true) {
        this.usage = usage;
        this.permissions = permissions;
        this.invoke = invoke;
        this.visible = visible;
    }
}

// Permissions constants
const GUEST = -1;
const PLAYER = 0;
const YOUTUBER = 3;
const VIP = 5;
const MVP = 7;
const MODERATOR = 10;
const ADMIN = 20;
const OWNER = 30;
const EVERYONE = [GUEST, PLAYER, YOUTUBER, VIP, MVP, MODERATOR, ADMIN, OWNER];
const REGISTERED = [PLAYER, YOUTUBER, VIP, MVP, MODERATOR, ADMIN, OWNER];
const MODPLUS = [MODERATOR, ADMIN, OWNER];
const ADMINPLUS = [ADMIN, OWNER];

const PERM_TABLE = [GUEST, PLAYER, YOUTUBER, VIP, MVP, MODERATOR, ADMIN, OWNER];
var HELP_TABLE = {};

global.cmds = {};

// GUEST COMMANDS 
// All players including guests have access to these
cmds["/help"] = new Command("/help - Displays commands & usages", EVERYONE, function (plyr, msg) {
	for (var p in plyr.permissionLevels) {
		var lvl = plyr.permissionLevels[p];
	    for (var x = 0; x < HELP_TABLE[lvl].length; ++x) {
	        var cmd = HELP_TABLE[lvl][x];
	        plyr.socket.emit("chat", { msg: cmd.usage });
	    }
	}
});

cmds["/me"] = new Command("/me <msg>", EVERYONE, function (player, msg) {
    chatAll("~~`" + player.color + "~`" + player.name + "~`yellow~` " + msg.substring(4));
});

// PLAYER COMMANDS
// These commands are restricted to players that have registered their accounts
// This restriction is done for either technical reasons or anti-spam protection
cmds["/password"] = new Command("/password <newPassword>", REGISTERED, function (player, msg) {
    player.changePass(msg.substring(10));
});

cmds["/confirm"] = new Command("/confirm <newPassword>", REGISTERED, function (player, msg) {
    player.confirmPass(msg.substring(9));
}, false);

cmds["/changeteam"] = new Command("/changeteam", REGISTERED, function (player, msg) {
    var split = msg.split(" ");
    if (split.length > 2) {ply.socket.emit("chat", { msg: "Bad syntax! The message should look like '/changeteam'"});return;}
    if (split.length == 1) {
        player.socket.emit("chat", { msg: "Are you sure? This costs 10% of your experience and money. You must have 10,000 exp. Type \"/changeteam <color>\" to continue. Make sure you aren't near any players or bases on your current team." });
    }
    if(split.length == 2) {
        if (player.experience <= 10000) {
            player.socket.emit("chat", { msg: "You don't have enough experience!" });
            return;
        }
        if (split[1] !== "green" && split[1] !== "blue" && split[1] !== "red") {
            player.socket.emit("chat", { msg: "Invalid team to switch to!" });
            return;
        }
        if (split[1] === "green") {
            player.socket.emit("chat", { msg: "Green team coming soon!" });
            return;
        }
        player.color = split[1];
        player.money *= .9;
        player.experience *= .9;
        player.save();
    }
});

cmds["/nameturret"] = new Command("/nameturret <name>", REGISTERED, function (player, msg) {
	var num = 0;
    var base = bases[player.sy][player.sx];
    if(base != 0 && base.owner == player.name) { base.name = msg.substring(12); num++; }
    player.socket.emit("chat", { msg: num + " turret(s) renamed." });
});

cmds["/pm"] = new Command("/pm <player> <msg>", REGISTERED, function (player, msg) {
    player.pm(msg);
});

cmds["/r"] = new Command("/r <msg>", REGISTERED, function (player, msg) {
    player.r(msg);
});

cmds["/swap"] = new Command("/swap", REGISTERED, function (player, msg) {
    player.swap(msg);
});

cmds["/mute"] = new Command("/mute <player> - You will no longer hear the player's chat messages.", EVERYONE, function (ply, msg) {
    if (msg.split(" ").length != 2) {ply.socket.emit("chat", { msg: "Bad syntax! The message should look like '/mute playernamewithouttag'"});return;} // split looks like {"/mute", "name"}
    var name = msg.split(" ")[1];
    var player = getPlayerFromName(name);
    if(player == -1){
	    ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
	    return;
    }
    ply.socket.emit("mute", { player:name });
    ply.socket.emit("chat", { msg: "Muted "+name+"." });
});

cmds["/unmute"] = new Command("/unmute <player> - You will begin hearing the player's chat messages again.", EVERYONE, function (ply, msg) {
    if (msg.split(" ").length != 2) {ply.socket.emit("chat", { msg: "Bad syntax! The message should look like '/mute playernamewithouttag'"});return;} // split looks like {"/unmute", "name"}
    var name = msg.split(" ")[1];
    var player = getPlayerFromName(name);
    if(player == -1){
	    ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
	    return;
    }
    ply.socket.emit("unmute", { player:name });
    ply.socket.emit("chat", { msg: "Unmuted "+name+"." });
});

cmds["/email"] = new Command("/email <you@domain.tld> - Sets your email for password resets", ADMINPLUS, function (player, msg) {
    debug("EMAIL!");
    player.setEmail(msg);
});

cmds["/green"] = new Command("/green Join green team", ADMINPLUS, function (player, msg) {
    player.color = "green";
});

// MODERATION COMMANDS
// These commands are accessible to moderators in the game
cmds["/broadcast"] = new Command("/broadcast <msg> - Send a message to the whole server", MODPLUS, function (player, msg) {
    chatAll("~`#f66~`       BROADCAST: ~`lime~`" + msg.substring(11));
});

cmds["/modmute"] = new Command("/modmute <player> <minutesToMute> - Mutes the specified player server-wide.", MODPLUS, function (ply, msg) {
    if (msg.split(" ").length != 3) {ply.socket.emit("chat", { msg: "Bad syntax! The message should look like '/mute playernamewithouttag minutes'"});return;} // split looks like {"/mute", "name", "minutesToMute"}
    var name = msg.split(" ")[1];
    var player = getPlayerFromName(name);
    if(player == -1){
        ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
        return;
    }
    var minutes = parseFloat(msg.split(" ")[2]);
    if (typeof minutes !== "number") return;

    if (minutes < 0) return;

    muteTable[player.name] = (Date.now() + (minutes * 60 * 1000));
    chatAll("~`violet~`" + player.name + "~`yellow~` has been muted for "+minutes+" minutes!");
});


// ADMINSTRATOR COMMANDS
// These commands are accessible to adminstrators in the game
cmds["/reboot"] = new Command("/reboot - Schedules a restart of the shard", ADMINPLUS, initReboot);

cmds["/tp"] = new Command("/tp <player> - Teleport to the player.", ADMINPLUS, function (ply, msg) {
    if (msg.split(" ").length != 2) {ply.socket.emit("chat", { msg: "Bad syntax! The message should look like '/tp playernamewithouttag'"});return;}
    var name = msg.split(" ")[1];
    var player = getPlayerFromName(name);
    if(player == -1){
        ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
        return;
    }

    var old_sy = ply.sy, old_sx = ply.sx;

    ply.x = player.x;
    ply.y = player.y;
    ply.sx = player.sx;
    ply.sy = player.sy;
    delete players[old_sy][old_sx][ply.id];
    players[ply.sy][ply.sx][ply.id] = ply;
    ply.onChangeSectors();

    ply.socket.emit("chat", { msg: "Player found, attempting to teleport. May fail if they are docked or dead." });
});

cmds["/settag"] = new Command("/settag <player> <tag> - Sets a player's tag. tag should not contain brackets.", ADMINPLUS, function (ply, msg) {
    if (msg.split(" ").length != 3) {ply.socket.emit("chat", { msg: "Bad syntax! The message should look like '/settag playernamewithouttag tag'"});return;}
    var name = msg.split(" ")[1];
    var newTag = msg.split(" ")[2];
    var player = getPlayerFromName(name);
    if(player == -1){
        ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
        return;
    }

    player.name = "["+newTag+"] "+name;
    player.save();
    ply.socket.emit("chat", { msg: "~`violet~`Tag set." });
});

cmds["/deltag"] = new Command("/deltag <player> <tag> - Removes a player's tag.", ADMINPLUS, function (ply, msg) {
    if (msg.split(" ").length != 2) {ply.socket.emit("chat", { msg: "Bad syntax! The message should look like '/settag playernamewithouttag'"});return;}
    var name = msg.split(" ")[1];
    var player = getPlayerFromName(name);
    if(player == -1){
        ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
        return;
    }

    player.name = name;
    player.save();
    ply.socket.emit("chat", { msg: "~`violet~`Tag removed." });
});

cmds["/smite"] = new Command("/smite <player> - Smites the specified player", ADMINPLUS, function (ply, msg) {
    if (msg.split(" ").length != 2) return;
    var name = msg.split(" ")[1];
    
    var player = getPlayerFromName(name);
    if(player == -1){
	    ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
	    return;
    }
    player.die(0);
    chatAll("~`violet~`" + player.name + "~`yellow~` has been Smitten!");
});

cmds["/kick"] = new Command("/kick <player> - Kicks the specified player", ADMINPLUS, function (ply, msg) {
    if (msg.split(" ").length != 2) return;
    var name = msg.split(" ")[1];

    var player = getPlayerFromName(name);
    if(player == -1){
	    ply.socket.emit("chat", { msg: "Player '"+name+"' not found." });
	    return;
    }
    player.kick();
    chatAll("~`violet~`" + name + "~`yellow~` has been kicked!");
});

cmds["/saveturrets"] = new Command("/saveTurrets - Runs a manual save on the server turrets", ADMINPLUS, saveTurrets);

if (Config.getValue("debug", false)) {
    cmds["/eval"] = new Command("/eval .... - Evaluates arbitrary JS on the server", ADMINPLUS, function (player, msg) {
        try {
            player.socket.emit("chat", { msg: eval(msg.substring(5)) });
        } catch (e) {
            player.socket.emit("chat", { msg: "An error occurred: " + e });
        }
    });
    
    cmds["/max"] = new Command("/max - Maxes out a player's stats for testing purposes", ADMINPLUS, function (player, msg) {
        player.rank = 20;
        player.money = Number.MAX_SAFE_INTEGER;
        player.experience = Number.MAX_SAFE_INTEGER;
    
        player.socket.emit("chat", {msg: "Max Mode Activated"});
    });
}

// Compute help menu
for (var x in PERM_TABLE) {
    HELP_TABLE[PERM_TABLE[x]] = []; // construct empty array
    for (var c in cmds) {
    	var cmd = cmds[c];
    	for(var p in cmd.permissions)
	        if (cmd.permissions[p] == PERM_TABLE[x] && cmd.visible)
	        	HELP_TABLE[PERM_TABLE[x]].push(cmd);
    }
}
