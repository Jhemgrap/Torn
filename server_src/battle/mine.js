
module.exports = function Mine(ownr, i, weaponID) {
	var self = {
		type: "Mine",
		id: i, // unique identifier
		time: 0, // time since spawned
		color: ownr.color, // what team owns me
		dmg: wepns[weaponID].damage,

		x: ownr.x,
		y: ownr.y,
		vx: weaponID != 33 ? 0 : Math.cos(ownr.angle) * 30, // grenades are the only mines that move
		vy: weaponID != 33 ? 0 : Math.sin(ownr.angle) * 30,
		sx: ownr.sx,
		sy: ownr.sy,

		owner: ownr,
		wepnID: weaponID,
	}
	self.tick = function () {
		self.x += self.vx; // move
		self.y += self.vy;
		if (self.time == 0) self.collideWithMines(); // When the mine is created, make sure it isn't placed on top of any other mines.
		if (self.wepnID > 25 && self.time++ > 25) self.die(); // pulse wave and grenade blow up after 1 second
		if (self.time++ > 25 * 3 * 60) self.die(); // all mines die after 3 minutes
	}
	self.collideWithMines = function(){ // When the mine is created, make sure it isn't placed on top of any other mines.
		for (var m in mines[self.sy][self.sx]) {
			var mine = mines[self.sy][self.sx][m];
			if (mine.id == self.id) continue; // ofc the mine is on top of itself
			if (squaredDist(mine, self) < square(wepns[self.weaponID].range)){ // if that mine is in this mine's "attack range"
				mine.die(); // destroy both
				self.die();
				break;
			}
		}
	}
	self.die = function () {
		self.die = function() { }; // Purpose unclear, please comment
		var power = 0; // how strongly this mine pushes people away on explosion
		if (self.wepnID == 15 || self.wepnID == 33) power = 400; //mine, grenade
		else if (self.wepnID == 32) power = 2000;
		for (var i in players[self.sy][self.sx]) {
			var p = players[self.sy][self.sx][i];
			if (squaredDist(p, self) < square(1024)) {
				var mult = power / Math.max(10, .001 + Math.hypot(p.x - self.x, p.y - self.y)); // not sure what's going on here but it works
				p.vx = mult * (Math.cbrt(p.x - self.x));
				p.vy = mult * (Math.cbrt(p.y - self.y)); // push the player
				p.updatePolars();//we edited rectangulars
				p.angle = p.driftAngle; // turn them away from the mine
			}
		}
		if (self.wepnID == 33) // if i'm a grenade
			for (var i in players[self.sy][self.sx]) {
				var p = players[self.sy][self.sx][i];
				if (squaredDist(p, self) < square(wepns[33].range * 10)) p.dmg(self.dmg, self); // if i'm in range of a player on explosion, damage them
			}
		sendAllSector('sound', { file: "boom", x: self.x, y: self.y, dx: 0, dy: 0 }, self.sx, self.sy);
		delete mines[self.sy][self.sx][self.id];
	}
	return self;
};
