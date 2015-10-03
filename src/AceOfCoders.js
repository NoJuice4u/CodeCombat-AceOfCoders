// Initialize key variables based on what side we belong to in order to reflect the "Mirroring"
var myQuadrants = [];
var restPoint = {};
var home = {};
var away = {};
var enemyTeam = "";
var initialBuildOrder = ["artillery", "archer", "archer", "archer", "archer", "archer", "archer", "archer"];
var previousAllyData;
var enemyInQuadrants = { "Southwest":0, "South":0, "West":0, "Center":0, "East":0, "North":0, "Northeast":0 };
var allyInQuadrants = { "Southwest":0, "South":0, "West":0, "Center":0, "East":0, "North":0, "Northeast":0 };
var nearestGoliath = this.findNearest(this.findByType("goliath", enemies));
if(this.team == "humans")
{
	myQuadrants = [ "South", "West", "Center", "East", "North"];
	restPoint = { "x": 55, "y": 45 };
	home = { "x": 25, "y": 25 };
	away = { "x": 90, "y": 80 };
	enemyTeam = "ogres";
}
else 
{
	myQuadrants = [ "North", "East", "Center", "West", "South" ];
	restPoint = { "x": 70, "y": 55 };
	home = { "x": 90, "y": 80 };
	away = { "x": 25, "y": 25 };
	enemyTeam = "humans";
}

var pointsMap = {};
var points = this.getControlPoints();
for (var indx = 0; indx < points.length; ++indx) {
	pointsMap[points[indx]] = indx;
}

// First few summons are pre-determined.  Then, Attempt to maintain one soldier for each
// capture point deemed interesting. Then, we aim to always have 1 artillery, unless we
// somehow have lots of gold.  Then, ensure that we have an equal number of towers to artillery.
// Mainly to pressure the goliath.  After that, archers.
this.buildArmy = function()
{
	var type = "archer";
	if(this.built.length >= initialBuildOrder.length)
	{
		var fArchers = this.findByType("archer", friends);
		var eArchers = this.findByType("archer", enemies);
		fArcherCount = 0;
		for(var fArcherIndex in fArchers)
		{
			if(fArchers[fArcherIndex].health > 0) fArcherCount += 1;
		}
		
		var fSoldiers = this.findByType("soldier", friends);
		var fSoldierCount = 0;
		for(var fSoldierIndex in fSoldiers)
		{
			if(fSoldiers[fSoldierIndex].health > 0) fSoldierCount += 1;
		}

		var fArtillery = this.findByType("artillery", friends);
		var fArtilleryCount = 0;
		for(var fArtilleryIndex in fArtillery)
		{
			if(fArtillery[fArtilleryIndex].health > 0) fArtilleryCount += 1;
		}
		
		var fTowers = this.findByType("arrow-tower", friends);
		var fTowerCount = 0;
		for(var fTowerIndex in fTowers)
		{
			if(fTowers[fTowerIndex].health > 0) fTowerCount += 1;
		}
		
		if(fArcherCount >= eArchers.length + 2 && fArcherCount > 2 && (fArtilleryCount < 2)) type = "artillery";
		else if(fArcherCount * 2 < fSoldierCount) type = "archer";
		// else if(fSoldierCount < myQuadrants.length) type = "soldier";
		else type = "archer";
	}
	else
	{
		type = initialBuildOrder[this.built.length];
	}

	if (this.now() > 20 && type == "archer" && this.gold >= this.costOf(type) * 3)
	{
		this.summon(type);
		this.summon(type);
		this.summon(type);
	}
	else if (this.gold >= this.costOf(type))
	{
		this.summon(type);
	}
	// If the game let me, I'd hurl my own soldiers that I spawned to an unowned control point.  T.T
};

this.controlHero = function() 
{
	var nearestEnemy = this.findNearest(enemies);
	var nearestArcher = this.findNearest(archers);
	var shouldAttack = this.now() > 90;
	if(nearestEnemy !== null)
	{
		if (shouldAttack)
		{
			if (nearestGoliath !== null) this.attack(nearestGoliath);
			else this.attack(nearestEnemy);
			return;
		}
		if (nearestArcher !== null && this.distanceTo(nearestArcher) < 3)
		{
			this.attack(nearestArcher);
			return;
		}
		if (nearestTower !== null && this.distanceTo(nearestTower) < 30) this.attack(nearestTower);
		if (nearestArtillery !== null && this.distanceTo(nearestArtillery) < 25 && this.isReady("throw")) this.throw(nearestArtillery);
		else if (nearestTower !== null && this.distanceTo(nearestTower) < 25 && this.isReady("throw")) this.throw(nearestTower);
		if (this.distanceTo(nearestEnemy) < 3) this.hurl(nearestEnemy, home);
		if (this.distanceTo(nearestEnemy) < 10 && this.isReady("stomp")) this.stomp();
		if (this.distanceTo(nearestEnemy) < 20 && nearestEnemy.type != "archer") this.attack(nearestEnemy);
		else this.move(restPoint);
	}
	else
	{
		this.move(restPoint);
	}
};

// This creates an array of points considered "Danger Zones".  We only calculate for
// slow missiles where we have a chance to escape.
this.findDangerZones = function()
{
	for (var i = 0; i < missiles.length; ++i) 
	{
		var missile = missiles[i];
		if(missile.type == "shell" || missile.type == "boulder")
		{
			dangerZones.push(missile);
		}
		// { "x": 45, "y": 35, "z":12.0 }
	}
};

// Archer's job is to defend the goliath.  The goliath spawns our units so we should protect him.
this.archerJob = function(friend)
{
	var escapeVector = this.escapeFromDanger(friend);
	var fNearestArcher = friend.findNearest(archers);

	if(escapeVector === false) if(this.escapeFromGiant(friend) === true) return;

	for (var qKey in points)
	{
		var q = points[qKey];
		if((allyInQuadrants[qKey] < 1 && friend.distanceTo(q.pos) <= 10) || (allyInQuadrants[qKey] === 0 && q.team === null))
		{
			allyInQuadrants[qKey] += 1;
			var heading;
			if(escapeVector === false) heading = q.pos;
			else 
			{
				var nVec = Vector.normalize(Vector.subtract(q.pos, friend.pos));
				heading = Vector.add(Vector.multiply(Vector.add(escapeVector, nVec), 5), friend.pos);
			}
			this.command(friend, "defend", heading);
			return;
		}
	}
	if(escapeVector !== false)
	{
		this.command(friend, "move", Vector.add(Vector.multiply(escapeVector, 6), friend.pos));
		return;
	}
	if(fNearestArcher !== null && friend.distanceTo(fNearestArcher) <= 25)
	{
		this.command(friend, "attack", fNearestArcher);
		return;
	}

	this.command(friend, "defend", friend);
};

// Artillery's main job is to destroy enemy artillery, and siege capture points not under our control.
// Sieging enemy capture points will help "Deny" the enemy funds.  However, because enemy artillery is
// a massive potential threat, we attack those first.
this.artilleryJob = function(friend)
{
	var escapeVector = this.escapeFromDanger(friend);
	if(escapeVector !== false && friend.health > 70)
	{
		var escape = Vector.add(Vector.multiply(escapeVector, 8), friend.pos);
		this.command(friend, "move", escape);
		return;
	}
	if(nearestArtillery !== null && friend.distanceTo(nearestArtillery) < 65)
	{
		this.command(friend, "attack", nearestArtillery);
		return;
	}
	if(this.escapeFromGiant(friend) === true) return;
	if(nearestTower !== null && friend.distanceTo(nearestTower) < 65)
	{
		this.command(friend, "attack", nearestTower);
		return;
	}

	for(var pKey in points)
	{
		if(points[pKey].team == enemyTeam)
		{
			if(allyInQuadrants[points[pKey]] > 0) continue;
			this.command(friend, "attackPos", points[pKey].pos);
			return;
		}
	}
	
	if(nearestGoliath !== null && friend.distanceTo(nearestGoliath) < 65)
	{
		this.command(friend, "attack", nearestGoliath);
		return;
	}
};

// Towers.  They seem to be very powerful if there's no artillery around.  Fortunately, our artillery
// is programmed to fight enemy artillery.
this.towerJob = function(friend)
{
	var nearestEnemy = friend.findNearest(this.findByType("archer", enemies));
	if(nearestEnemy === null || friend.distanceTo(nearestEnemy) <= 30) nearestEnemy = friend.findNearest(this.findByType("arrow-tower", enemies));
	if(nearestEnemy === null || friend.distanceTo(nearestEnemy) > 30) nearestEnemy = friend.findNearest(enemies);
	if(nearestEnemy !== null && friend.distanceTo(nearestEnemy) > 30) this.command(friend, "attack", nearestEnemy);
};

// DONT STAND IN FIRE!
this.escapeFromDanger = function(friend)
{
	var inDangerZone = false;
	for(var dangerZoneKey in dangerZones)
	{
		if(friend.distanceTo(dangerZones[dangerZoneKey].targetPos) < 20 && (dangerZones[dangerZoneKey].type == "boulder" || dangerZones[dangerZoneKey].pos.z > 4))
		{
			inDangerZone = dangerZones[dangerZoneKey];
		}
	}
	if(inDangerZone === false) return false;
	var escapeVector = Vector.normalize(Vector.subtract(friend.pos, inDangerZone.targetPos));
	if(escapeVector.x === 0 && escapeVector.y === 0)
	{
		escapeVector = Vector.normalize(Vector.subtract(friend.pos, points[3].pos));
	}
	return escapeVector;
};

this.escapeFromGiant = function(friend)
{
	if(nearestGoliath === null) return;
	if(nearestGoliath.pos.distance(friend.pos) > 17) return false;
	this.command(friend, "move", Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(friend.pos, nearestGoliath.pos)), 8), friend.pos));
	return true;
};

loop {
	var fArcherCount = 0;
	var dangerZones = [];
	points = this.getControlPoints();
	var missiles = this.findEnemyMissiles().concat(this.findFriendlyMissiles());
	var friends = this.built;
	var enemies = this.findEnemies();
	var archers = this.findByType("archer", enemies);
	var nearestArtillery = this.findNearest(this.findByType("artillery", enemies));
	var nearestTower = this.findNearest(this.findByType("arrow-tower", enemies));

	this.buildArmy();
	this.findDangerZones();

	enemyInQuadrants = [0, 0, 0, 0, 0, 0, 0];
	allyInQuadrants = [0, 0, 0, 0, 0, 0, 0];

	for(var idx in friends)
	{
		if(friends[idx].health <= 0) continue;
		if(friends[idx].type == "soldier") this.archerJob(friends[idx]);
		else if(friends[idx].type == "archer") this.archerJob(friends[idx]);
		else if(friends[idx].type == "artillery") this.artilleryJob(friends[idx]);
		else if(friends[idx].type == "arrow-tower") this.towerJob(friends[idx]);
	}

	this.controlHero();
}
