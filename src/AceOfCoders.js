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
var assignedJobIndex = 0;

if(this.team == "humans")
{
	myQuadrants = [ "South", "West", "Center", "East", "North"];
	restPoint = { "x": 55, "y": 45 };
	home = new Vector(25, 25);
	away = { "x": 90, "y": 80 };
	enemyTeam = "ogres";
}
else 
{
	myQuadrants = [ "North", "East", "Center", "West", "South" ];
	restPoint = { "x": 70, "y": 55 };
	home = new Vector(90, 80);
	away = { "x": 25, "y": 25 };
	enemyTeam = "humans";
}

var jobQueue = {
	"DefendA": {"Job": "Capture", "Quadrant": 1, "TargetSize": 1, "Members": [], "EscapeVector": new Vector(0, 0)},
	"DefendB": {"Job": "Capture", "Quadrant": 2, "TargetSize": 1, "Members": [], "EscapeVector": new Vector(0, 0)},
	"ArcherForceA": {"Job": "Assault", "TargetSize": 2, "Members": [], "EscapeVector": new Vector(0, 0)},
	"DefendC": {"Job": "Capture", "Quadrant": 4, "TargetSize": 1, "Members": [], "EscapeVector": new Vector(0, 0)},
	"DefendD": {"Job": "Capture", "Quadrant": 5, "TargetSize": 1, "Members": [], "EscapeVector": new Vector(0, 0)},
	"ArcherForceB": {"Job": "Assault", "TargetSize": 2, "Members": [], "EscapeVector": new Vector(0, 0)},
	"DefendE": {"Job": "Capture", "Quadrant": 3, "TargetSize": 1, "Members": [], "EscapeVector": new Vector(0, 0)},
	"SiegeA": {"Job": "Siege", "TargetSize": 1, "Members": [], "EscapeVector": new Vector(0, 0)},
	"SiegeB": {"Job": "Siege", "TargetSize": 1, "Members": [], "EscapeVector": new Vector(0, 0)},
	"GoNuts": {"Job": "Assault", "TargetSize": 100, "Members": [], "EscapeVector": new Vector(0, 0)},
	"Tower": {"Job": "Tower", "TargetSize": 100, "Members": [], "EscapeVector": new Vector(0, 0)}
};

var roles = {
	"soldier": ["Capture", "Fluff"],
	"archer": ["Capture", "Assault", "Fluff"],
	"artillery": ["Siege", "Fluff"],
	"arrow-tower": ["Tower"]
};

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
	loop
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

		if (this.gold >= this.costOf(type))
		{
			this.summon(type);
			this.assignJobs();
		}
		else
		{
			break;
		}
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
		else if (nearestArcher !== null && this.distanceTo(nearestArcher) < 25 && this.isReady("throw")) this.throw(nearestArcher);
		else if (nearestTower !== null && this.distanceTo(nearestTower) < 25 && this.isReady("throw")) this.throw(nearestTower);
		if (nearestArtillery !== null && this.distanceTo(nearestArtillery) < 5) this.attack(nearestArtillery);
		if (this.distanceTo(nearestGoliath) < 8 && this.isReady("hurl")) this.hurl(nearestGoliath, home);
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
// DONT STAND IN FIRE!
this.escapeFromDanger = function(pos, range)
{
	var inDangerZone = false;
	for(var dangerZoneKey in dangerZones)
	{
		if(pos.distance(dangerZones[dangerZoneKey].targetPos) < range && (dangerZones[dangerZoneKey].type == "boulder" || dangerZones[dangerZoneKey].pos.z > 4))
		{
			inDangerZone = dangerZones[dangerZoneKey];
		}
	}
	if(inDangerZone === false) return false;
	var escapeVector = Vector.normalize(Vector.subtract(pos, inDangerZone.targetPos));
	if(escapeVector.x === 0 && escapeVector.y === 0)
	{
		escapeVector = Vector.normalize(Vector.subtract(pos, points[3].pos));
	}
	return escapeVector;
};

this.escapeFromGiant = function(friend)
{
	if(nearestGoliath === null) return;
	if(nearestGoliath.pos.distance(friend.pos) > 15) return false;
	this.command(friend, "move", Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(friend.pos, nearestGoliath.pos)), 8), friend.pos));
	return true;
};

this.assignJobs = function()
{
	var newbieUnit = this.built[this.built.length-1];
	for(var jobQueueKey in jobQueue)
	{
		if(jobQueue[jobQueueKey].Members.length < jobQueue[jobQueueKey].TargetSize)
		{
			for(var role in roles[newbieUnit.type])
			{
				if(roles[newbieUnit.type][role] == jobQueue[jobQueueKey].Job)
				{
					// this.say(roles[newbieUnit.type][role]);
					jobQueue[jobQueueKey].Members.push(newbieUnit);
					assignedJobIndex += 1;
					return;
				}
			}
		}
		else
		{
			for(var memberKey in jobQueue[jobQueueKey].Members)
			{
				if(jobQueue[jobQueueKey].Members[memberKey].health <= 0)
				{
					// this.say(jobQueue[jobQueueKey].Job);
					jobQueue[jobQueueKey].Members[memberKey] = newbieUnit;
					assignedJobIndex += 1;
					return;
				}
			}
		}
	}
};

this.capturePoint = function(friends, quadrant)
{
	var fNearestArcher = friends[0].findNearest(archers);
	var distance = 999;
	if(fNearestArcher !== null) distance = friends[0].distanceTo(fNearestArcher);

	for(var allyCaptureJobIndex in friends)
	{
		var friend = friends[allyCaptureJobIndex];
		var escapeVector = this.escapeFromDanger(friend.pos, 12);
		if(escapeVector === false) if(this.escapeFromGiant(friend) === true) continue;

		var q = points[quadrant];
		allyInQuadrants[quadrant] += 1;
		var heading;
		if(escapeVector === false) heading = q.pos;
		else 
		{
			var nVec = Vector.normalize(Vector.subtract(q.pos, friend.pos));
			heading = Vector.add(Vector.multiply(Vector.add(escapeVector, nVec), 5), friend.pos);
		}

		if(distance <= 25)
		{
			this.command(friend, "attack", fNearestArcher);
			continue;
		}
		else
		{
			this.command(friend, "defend", heading);
		}
	}
};

this.assault = function(friends, oldCombinedEscapeVector)
{
	var fNearestArcher = null;
	var distance = 999;
	
	var combinedEscapeVector = new Vector(0, 0);

	for(var allyCaptureJobIndex in friends)
	{
		var friend = friends[allyCaptureJobIndex];
		if(friend.health <= 0) continue;
		
		fNearestArcher = friend.findNearest(this.findByType("archer", enemies));
		if(fNearestArcher !== null) distance = friend.distanceTo(fNearestArcher);
		
		var escapeVector = this.escapeFromDanger(friend.pos, 14);
		if(escapeVector === false) if(this.escapeFromGiant(friend) === true) continue;

		if(escapeVector !== false)
		{
			combinedEscapeVector.add(escapeVector);
			this.command(friend, "move", Vector.add(Vector.multiply(oldCombinedEscapeVector, 25), friend.pos));
			continue;
		}
		else if(distance <= 25)
		{
			this.command(friend, "attack", fNearestArcher);
			continue;
		}
		else
		{
			var fNearestThreat = fNearestArcher;
			if(fNearestThreat === null) fNearestThreat = friend.findNearest(enemies);
			if(fNearestThreat === null)
			{
				this.command(friend, "defend", this);
			}
			else
			{
				var nVec = Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(fNearestThreat.pos, friend.pos)), 2), friend.pos);
				escapeVector = this.escapeFromDanger(nVec, 20);
				if(escapeVector === false)
				{
					this.command(friend, "attack", fNearestThreat);
				}
				else
				{
					combinedEscapeVector.add(escapeVector);
					heading = Vector.add(Vector.multiply(Vector.add(oldCombinedEscapeVector, friend.pos), 50), friend.pos);
					this.command(friend, "move", heading);
				}
			}
		}
	}

	var vA = Vector.normalize(combinedEscapeVector);
	var vB = Vector.normalize(Vector.subtract(this.pos, nearestGoliath.pos));
	
	return Vector.normalize(Vector.add(vA, vB));
};

this.siege = function(friends)
{
	// Only works with 1 so far
	var friend = friends[0];
	var escapeVector = this.escapeFromDanger(friend.pos, 12);
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
	
	for(var jobQueueKey in jobQueue)
	{
		if(jobQueue[jobQueueKey].Members.length === 0) continue;
		if(jobQueue[jobQueueKey].Job == "Capture") this.capturePoint(jobQueue[jobQueueKey].Members, jobQueue[jobQueueKey].Quadrant);
		else if(jobQueue[jobQueueKey].Job == "Assault") jobQueue[jobQueueKey].EscapeVector = this.assault(jobQueue[jobQueueKey].Members, jobQueue[jobQueueKey].EscapeVector);
		else if(jobQueue[jobQueueKey].Job == "Siege") this.siege(jobQueue[jobQueueKey].Members);
	}

	this.controlHero();
}
