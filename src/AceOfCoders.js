// Initialize key variables based on what side we belong to in order to reflect the "Mirroring"
var myQuadrants = [];
var restPoint = {};
var home = {};
var away = {};
var enemyTeam = "";
var initialBuildOrder = ["artillery", "soldier", "soldier", "archer", "archer"];
var previousAllyData;
var nearestGoliath = this.findNearest(this.findByType("goliath", enemies));
var assignedJobIndex = 0;

if(this.team == "humans")
{
	myQuadrants = [ "South", "West", "Center", "East", "North"];
	restPoint = new Vector(60, 50);
	home = new Vector(25, 25);
	away = new Vector(90, 80);
	enemyTeam = "ogres";
}
else 
{
	myQuadrants = [ "North", "East", "Center", "West", "South" ];
	restPoint = new Vector(60, 50);
	home = new Vector(90, 80);
	away = new Vector(25, 25);
	enemyTeam = "humans";
}

var jobQueue = {
	"DefendA": {"Job": "Capture", "Quadrant": 1, "TargetSize": 1, "Members": []},
	"DefendB": {"Job": "Capture", "Quadrant": 2, "TargetSize": 1, "Members": []},
	"ArcherForceA": {"Job": "Assault", "TargetSize": 2, "Members": []},
	"ArcherForceC": {"Job": "Assault", "TargetSize": 2, "Members": []},
	"ArcherForceB": {"Job": "Guard", "TargetSize": 2, "Members": []},
	"DefendC": {"Job": "Capture", "Quadrant": 3, "TargetSize": 1, "Members": []},
	"DefendD": {"Job": "Capture", "Quadrant": 4, "TargetSize": 1, "Members": []},
	"DefendE": {"Job": "Capture", "Quadrant": 5, "TargetSize": 1, "Members": []},
	"SiegeA": {"Job": "Siege", "TargetSize": 1, "Members": [], "RestPoint": new Vector(60, 70)},
	"SiegeB": {"Job": "Siege", "TargetSize": 1, "Members": [], "RestPoint": new Vector(60, 30)},
	"SiegeC": {"Job": "Siege", "TargetSize": 4, "Members": []},
	"GoNuts": {"Job": "Defend", "TargetSize": 100, "Members": []},
	"Tower": {"Job": "Tower", "TargetSize": 100, "Members": []}
};

var roles = {
	"soldier": ["Capture", "Defend"],
	"archer": ["Capture", "Assault", "Guard", "Defend"],
	"artillery": ["Siege"],
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
			var fSoldiers = this.findByType("soldier", friends);
			var eSoldiers = this.findByType("soldier", enemies);
			var fArtillery = this.findByType("artillery", friends);
			var fArrowTowers = this.findByType("arrow-tower", friends);
			
			fArcherCount = 0;
			eArcherCount = 0;
			fSoldierCount = 0;
			eSoldierCount = 0;
			fArtilleryCount = 0;
			fArrowTowersCount = 0;
			
			// There's a race condition where the health can drop to 0 and remain in the array.
			// if an artillery targets an enemy with 0 health, it's a huge waste, so we filter
			// out units at 0 health
			for(var fArcherIndex in fArchers)
			{
				if(fArchers[fArcherIndex].health > 0) fArcherCount += 1;
			}
			for(var eArcherIndex in eArchers)
			{
				if(eArchers[eArcherIndex].health > 0) eArcherCount += 1;
			}
			for(var fSoldierIndex in fSoldiers)
			{
				if(fSoldiers[fSoldierIndex].health > 0) fSoldierCount += 1;
			}
			for(var eSoldierIndex in eSoldiers)
			{
				if(eSoldiers[eSoldierIndex].health > 0) eSoldierCount += 1;
			}
			for(var fArtilleryIndex in fArtillery)
			{
				if(fArtillery[fArtilleryIndex].health > 0) fArtilleryCount += 1;
			}
			for(var fArrowTowerIndex in fArrowTowers)
			{
				if(fArrowTowers[fArrowTowerIndex].health > 0) fArrowTowersCount += 1;
			}
			
			if (fSoldierCount * 2 < eSoldierCount - 2) type = "soldier"; // Protection against mass soldiers.
			else if (fArcherCount >= eArcherCount + 2 && fArcherCount > 2 && (fArtilleryCount < 2)) type = "artillery"; // Maintain up to 2 artillery.
			else if (fArcherCount > 8 && fSoldierCount < 2) type = "soldier"; // Meat Shield.
			else type = "archer"; // Shoot things.  Things die.
		}
		else
		{
			// Game start is always the same, so we can just hard-code the startup.
			type = initialBuildOrder[this.built.length];
		}

		if (nearestGoliath !== null && this.distanceTo(nearestGoliath) < 8 && (type == "soldier" || type == "archer"))
		{
			// If we're too close to the goliath, don't spawn single units.  They'll just get clobbered.
			// Spawning in pairs should allow time for one to escape.
			if(this.gold >= this.costOf("archer") * 2)
			{
				this.summon(type);
				this.assignJobs();
				this.summon(type);
				this.assignJobs();
			}
			break;
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
};

this.controlHero = function() 
{
	var nearestEnemy = this.findNearest(enemies);
	var nearestArcher = this.findNearest(archers);
	var nearestSoldier = this.findNearest(this.findByType("soldier", enemies));
	
	var shouldAttack = this.now() > 90 || enemyPoints === 0;
	if(nearestEnemy !== null)
	{
		if (shouldAttack)
		{
			if (nearestGoliath !== null) this.attack(nearestGoliath);
			else this.attack(nearestEnemy);
			return;
		}
		// If the goliath wants to get up close and personal, make sure he has difficulty spawning archers,
		// since archers are really the only ones that can outrun the goliath.
		if (nearestArcher !== null && this.distanceTo(nearestArcher) < 5)
		{
			this.attack(nearestArcher);
			return;
		}
		if (nearestSoldier !== null && this.distanceTo(nearestSoldier) < 3)
		{
			this.attack(nearestSoldier);
			return;
		}
		if (nearestTower !== null && this.distanceTo(nearestTower) < 30) this.attack(nearestTower);
		// Hack for the "Artillery on Steriods" issue.
		if(this.now() > 7)
		{
			if (nearestArtillery !== null && this.distanceTo(nearestArtillery) < 25 && this.isReady("throw")) this.throw(nearestArtillery);
			else if (this.now() < 20 && nearestArcher !== null && this.distanceTo(nearestArcher) < 25 && this.isReady("throw"))
			{
				var targetArcher = nearestArcher;
				for(var aIndex in archers)
				{
					if(archers[aIndex].health <= 0) continue;
					if(archers[aIndex].target !== null && archers[aIndex].target.pos.distance(archers[aIndex].pos) <= 25) break;
				}
				this.throw(targetArcher);
			}
			else if (nearestTower !== null && this.distanceTo(nearestTower) < 25 && this.isReady("throw")) this.throw(nearestTower);
		}
		if (nearestArtillery !== null && this.distanceTo(nearestArtillery) < 5) this.attack(nearestArtillery);
		if (this.distanceTo(away) < away.distance(nearestGoliath.pos) && this.isReady("stomp")) this.stomp();
		if (nearestGoliath !== null && this.distanceTo(nearestGoliath) < 12 && this.distanceTo(away) < away.distance(nearestGoliath.pos) && this.isReady("hurl")) this.hurl(nearestGoliath, away);
		// if (nearestGoliath !== null && this.distanceTo(nearestGoliath) < 8 && this.isReady("hurl")) this.hurl(nearestGoliath, home);
		if (this.distanceTo(nearestEnemy) < 25 && nearestEnemy.type != "archer") this.attack(nearestEnemy);
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
this.escapeFromDanger = function(pos, range, minRange)
{
	var inDangerZone = false;
	for(var dangerZoneKey in dangerZones)
	{
		if(pos.distance(dangerZones[dangerZoneKey].targetPos) < range && pos.distance(dangerZones[dangerZoneKey].targetPos) >= minRange && (dangerZones[dangerZoneKey].type == "boulder" || dangerZones[dangerZoneKey].pos.z > 4))
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

this.checkUnderSiege = function(pos, range, minRange)
{
	var underSiege = false;
//	for(var dangerZoneKey in dangerZones)
//	{
//		if(pos.distance(dangerZones[dangerZoneKey].targetPos) < range && pos.distance(dangerZones[dangerZoneKey].targetPos) >= minRange && (dangerZones[dangerZoneKey].type == "boulder" || dangerZones[dangerZoneKey].pos.z > 4))
//		{
//			underSiege = true;
//			break;
//		}
//	}
	return underSiege;
};

this.escapeFromMelee = function(friend, range)
{
	if(friend.type == "soldier") range = 5;
	if(nearestGoliath !== null && nearestGoliath.pos.distance(friend.pos) <= range)
	{
		this.command(friend, "move", Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(friend.pos, nearestGoliath.pos)), 8), friend.pos));
		return true;
	}
	if(nearestGoliath !== null && this.pos.distance(friend.pos) <= 8)
	{
		this.command(friend, "move", Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(friend.pos, nearestGoliath.pos)), 8), friend.pos));
		return true;
	}
	if(friend.type == "soldier") return false;
	for(var soldierIndex in enemySoldiers)
	{
		var soldier = enemySoldiers[soldierIndex];
		if(soldier.pos.distance(friend.pos) > 10) continue;
		this.command(friend, "move", Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(friend.pos, soldier.pos)), 8), friend.pos));
		return true;
	}
	return false;
};

// When a unit is spawned, we assign it a job, by adding to the array, or replacing
// a dead unit.
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
					if(jobQueue[jobQueueKey].Job == "Capture" && points[jobQueue[jobQueueKey].Quadrant].team == enemyTeam) continue;
					jobQueue[jobQueueKey].Members.push(newbieUnit);
					assignedJobIndex += 1;
					return;
				}
			}
		}
		else
		{
			for(role in roles[newbieUnit.type])
			{
				for(var memberKey in jobQueue[jobQueueKey].Members)
				{
					if(roles[newbieUnit.type][role] == jobQueue[jobQueueKey].Job && jobQueue[jobQueueKey].Members[memberKey].health <= 0)
					{
						// this.say(jobQueue[jobQueueKey].Job);
						if(jobQueue[jobQueueKey].Job == "Capture" && points[jobQueue[jobQueueKey].Quadrant].team == enemyTeam) continue;
						jobQueue[jobQueueKey].Members[memberKey] = newbieUnit;
						assignedJobIndex += 1;
						return;
					}
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
		var escapeVector = this.escapeFromDanger(friend.pos, 15, 5);
		if(escapeVector === false) if(this.escapeFromMelee(friend, 16) === true) continue;

		var q = points[quadrant];
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
			this.command(friend, "move", heading);
		}
	}
};

this.assault = function(friends)
{
	var combinedEscapeVector = false;
	var averagedVectorPos = false;
	var assaultMembers = [];
	
	for(var friendIndex in friends)
	{
		var friend = friends[friendIndex];
		if(friend.health <= 0 && friend.type == "artillery") continue;
		assaultMembers.push(friend);
		
		var escapeVector = this.escapeFromDanger(friend.pos, 15, 0);
		if(escapeVector !== false)
		{
			if(combinedEscapeVector === false) combinedEscapeVector = new Vector(0, 0);
			combinedEscapeVector.add(escapeVector);
		}
		if(averagedVectorPos === false) averagedVectorPos = friend.pos;
		averagedVectorPos = Vector.divide(Vector.add(averagedVectorPos, friend.pos), 2);
	}
	if(combinedEscapeVector !== false) combinedEscapeVector = Vector.normalize(combinedEscapeVector);

	for(var memberIndex in assaultMembers)
	{
		friend = assaultMembers[memberIndex];
		
		var fNearestArcher = friend.findNearest(this.findByType("archer", enemies));
		if(fNearestArcher !== null) distance = friend.distanceTo(fNearestArcher);
		if(this.escapeFromMelee(friend, 14) === true) continue;

		if(combinedEscapeVector !== false)
		{
			var additive = Vector.multiply(combinedEscapeVector, 10);
			this.command(friend, "move", Vector.add(additive, friend.pos));
			continue;
		}
		else if(fNearestArcher !== null && distance <= 25 && nearestGoliath !== null && friend.distanceTo(nearestGoliath) > 20)
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
				this.command(friend, "move", averagedVectorPos);
			}
			else
			{
				var nVec = Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(fNearestThreat.pos, friend.pos)), 5), friend.pos);
				escapeVector = this.escapeFromDanger(nVec, 20, 0);
				if(escapeVector === false)
				{
					if(fNearestThreat !== null && nearestGoliath !== null && friend.distanceTo(nearestGoliath) + 5 < friend.distanceTo(fNearestThreat))
						this.command(friend, "defend", nVec);
					else this.command(friend, "defend", nVec);
				}
				else
				{
					heading = Vector.add(Vector.subtract(friend.pos, Vector.multiply(escapeVector, 10)), friend.pos);
					this.command(friend, "defend", heading);
				}
			}
		}
	}
};

this.siege = function(friends, restPoint)
{
	// Attack Queue
	var priorityQueue = [];
	var priorityQueueAssigned = [];
	var eArtillery = this.findByType("artillery", enemies);
	for(var eArtilleryIndex in eArtillery)
	{
		priorityQueue.push(eArtillery[eArtilleryIndex]);
		priorityQueueAssigned.push(false);
	}
	var eTower = this.findByType("arrow-tower", enemies);
	for(var eTowerIndex in eTower)
	{
		priorityQueue.push(eTower[eTowerIndex]);
		priorityQueueAssigned.push(false);
	}
	for(var pKey in points)
	{
		if(points[pKey].team == enemyTeam && points[pKey].pos.distance(this.pos) > 15 && this.checkUnderSiege(points[pKey].pos, 15, 0) === false)
		{
			priorityQueue.push(points[pKey].pos);
			priorityQueueAssigned.push(false);
		}
	}
	
	var attackIndex = 0;
	for(var friendIndex in friends)
	{
		var friend = friends[friendIndex];
		if(friend.health <= 0) continue;
		if(this.now() < 5)
		{
			this.command(friend, "attackPos", Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(nearestGoliath.pos, friend.pos)), 65), friend.pos));
			continue;
		}
		if(this.escapeFromMelee(friend, 10) === true) continue;
		var escapeVector = this.escapeFromDanger(friend.pos, 15, 0);
		//if(escapeVector !== false && friend.health > 70)
		if(escapeVector !== false)
		{
			var escape = Vector.add(Vector.multiply(escapeVector, 8), friend.pos);
			this.command(friend, "move", escape);
			continue;
		}
		
		var atkDistance = 999;
		var atkIndex = 0;
		var target = false;
		while(priorityQueue.length > attackIndex)
		{
			if(friend.pos.distance(priorityQueue[attackIndex]) < atkDistance && priorityQueueAssigned[attackIndex] === false)
			{
				atkDistance = friend.pos.distance(priorityQueue[attackIndex]);
				atkIndex = attackIndex;
				target = priorityQueue[attackIndex];
				break;
			}
			attackIndex += 1;
		}
		priorityQueueAssigned[atkIndex] = true;
		if(target !== false) this.command(friend, "attackPos", target);
		else this.command(friend, "move", restPoint);
	}
};

this.tower = function(friends)
{
	for(var towerIndex in friends)
	{
		friend = friends[towerIndex];
		if(friend.health <= 0) continue;
		var eTar = friend.findNearest("archer", enemies);
		if(eTar === null) eTar = friend.findNearest("soldier", enemies);
		if(eTar === null) eTar = friend.findNearest(enemies);
		this.command(friend, "attack", eTar);
	}
};

this.defend = function(friends)
{
	var artilleries = this.findByType("artillery", friends);
	var artillery = false;
	for(var artilleryIndex in artilleries)
	{
		if(artilleries[artilleryIndex].health > 0)
		{
			artillery = artilleries[artilleryIndex];
		}
	}
	
	for(var friendIndex in friends)
	{
		friend = friends[friendIndex];
		var eTar = friend.findNearest("archer", enemies);
		if(eTar === null) eTar = friend.findNearest("soldier", enemies);
		if(eTar === null) eTar = friend.findNearest(enemies);
		if(eTar === null) eTar = this;
		if(artillery === false) this.command(friend, "defend", eTar.pos);
		else this.command(friend, "defend", artillery);
	}
};

this.guard = function(friends)
{
	for(var allyCaptureJobIndex in friends)
	{
		var friend = friends[allyCaptureJobIndex];
		var escapeVector = this.escapeFromDanger(friend.pos, 15, 5);
		if(escapeVector === false) if(this.escapeFromMelee(friend, 10) === true) continue;

		fNearestThreat = friend.findNearest(this.findByType("archer", enemies));
		if(fNearestThreat === null) fNearestThreat = friend.findNearest(this.findByType("artillery", enemies));
		if(fNearestThreat === null) fNearestThreat = friend.findNearest(this.findByType("soldier", enemies));
		if(fNearestThreat !== null && friend.distanceTo(fNearestThreat) <= 25) this.command(friend, "attack", fNearestThreat);
		else this.command(friend, "defend", friend);
		
		continue;
//		if(escapeVector === false) heading = q.pos;
//		else 
//		{
//			var nVec = Vector.normalize(Vector.subtract(q.pos, friend.pos));
//			heading = Vector.add(Vector.multiply(Vector.add(escapeVector, nVec), 5), friend.pos);
//		}
//		this.command(friend, "move", heading);
	}
};

loop {
	var fArcherCount = 0;
	var dangerZones = [];
	points = this.getControlPoints();
	var missiles = this.findByType("shell", this.findEnemyMissiles())
		.concat(this.findByType("boulder", this.findEnemyMissiles()))
		.concat(this.findByType("shell", this.findFriendlyMissiles()))
		.concat(this.findByType("boulder", this.findFriendlyMissiles()));
	var friends = this.built;
	var enemies = this.findEnemies();
	var archers = this.findByType("archer", enemies);
	var nearestArtillery = this.findNearest(this.findByType("artillery", enemies));
	var nearestTower = this.findNearest(this.findByType("arrow-tower", enemies));
	var enemySoldiers = this.findByType("soldier", enemies);
	var myPoints = 0;
	var enemyPoints = 0;
	for(var pKey in points)
	{
		if(points[pKey].team == enemyTeam) enemyPoints += 1;
		else if(points[pKey].team == this.team) myPoints += 1;
	}

	this.findDangerZones();

	for(var jobQueueKey in jobQueue)
	{
		if(jobQueue[jobQueueKey].Members.length === 0) continue;
		if(jobQueue[jobQueueKey].Job == "Capture") this.capturePoint(jobQueue[jobQueueKey].Members, jobQueue[jobQueueKey].Quadrant);
		else if(jobQueue[jobQueueKey].Job == "Assault") jobQueue[jobQueueKey].EscapeVector = this.assault(jobQueue[jobQueueKey].Members);
		else if(jobQueue[jobQueueKey].Job == "Siege") this.siege(jobQueue[jobQueueKey].Members, jobQueue[jobQueueKey].RestPoint);
		else if(jobQueue[jobQueueKey].Job == "Defend") this.defend(jobQueue[jobQueueKey].Members);
		else if(jobQueue[jobQueueKey].Job == "Guard") this.guard(jobQueue[jobQueueKey].Members);
	}

	this.tower(this.findByType("arrow-tower", friends));
	this.controlHero();
	this.buildArmy();
}
