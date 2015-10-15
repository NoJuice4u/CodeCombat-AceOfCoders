// Initialize key variables based on what side we belong to in order to reflect the "Mirroring"
var restPoint = {};
var home = {};
var away = {};
var enemyTeam = "";
var initialBuildOrder = ["artillery", "archer", "archer", "archer", "archer", "archer"];
var nearestGoliath = this.findNearest(this.findByType("goliath", enemies));
var assignedJobIndex = 0;
var lastArtillerySpawn = -10;
var spawnTimer = -3;
var scatterVector = false;
var retreat = 0;

if (this.team == "humans")
{
	restPoint = new Vector(70, 60);
	home = new Vector(25, 25);
	away = new Vector(90, 80);
	enemyTeam = "ogres";
}
else 
{
	restPoint = new Vector(50, 40);
	home = new Vector(90, 80);
	away = new Vector(25, 25);
	enemyTeam = "humans";
}

var mid = new Vector(60, 50);

// Job Definition table.  When I spawn a unit, I crawl down this table looking for an open
// slot to assign a job.  Defending the nearest adjacent points take top priority, and then
// I build an assault team of 6, using 2 teams of 3.
var jobQueue = {
	"DefendA": {"Job": "Capture", "Quadrant": 1, "TargetSize": 1, "Members": []},
	"DefendB": {"Job": "Capture", "Quadrant": 2, "TargetSize": 1, "Members": []},
	"ArcherForceA": {"Job": "Assault", "TargetSize": 3, "Members": []},
	"ArcherForceB": {"Job": "Assault", "TargetSize": 3, "Members": []},
	"DefendC": {"Job": "Capture", "Quadrant": 3, "TargetSize": 1, "Members": []},
	"ArcherForceC": {"Job": "Assault", "TargetSize": 2, "Members": []},
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

// First few summons are pre-determined.  Then, Attempt to maintain one soldier for each
// capture point deemed interesting. Then, we aim to always have 1 artillery, unless we
// somehow have lots of gold.  Then, ensure that we have an equal number of towers to artillery.
// Mainly to pressure the goliath.  After that, archers.  Due to the artillery acceleration
// bug, I no longer spawn an artillery first, since whoever manages to exploit this bug first
// has an advantage in that scenario.
this.buildArmy = function()
{
	loop
	{
		var type = "archer";
		if (this.built.length >= initialBuildOrder.length)
		{
			var fArchers = this.findByType("archer", friends);
			var eArchers = this.findByType("archer", enemies);
			var fSoldiers = this.findByType("soldier", friends);
			var eSoldiers = this.findByType("soldier", enemies);
			var fArtillery = this.findByType("artillery", friends);
			var eArtillery = this.findByType("artillery", enemies);
			var fArrowTowers = this.findByType("arrow-tower", friends);
			
			fArcherCount = 0;
			eArcherCount = 0;
			fSoldierCount = 0;
			eSoldierCount = 0;
			fArtilleryCount = 0;
			eArtilleryCount = 0;
			fArrowTowersCount = 0;
			
			// There's a race condition where the health can drop to 0 and remain in the array.
			// if an artillery targets an enemy with 0 health, it's a huge waste, so we filter
			// out units at 0 health
			for(var fArcherIndex in fArchers)
			{
				if (fArchers[fArcherIndex].health > 0) fArcherCount += 1;
			}
			for(var eArcherIndex in eArchers)
			{
				if (eArchers[eArcherIndex].health > 0) eArcherCount += 1;
			}
			for(var fSoldierIndex in fSoldiers)
			{
				if (fSoldiers[fSoldierIndex].health > 0) fSoldierCount += 1;
			}
			for(var eSoldierIndex in eSoldiers)
			{
				if (eSoldiers[eSoldierIndex].health > 0) eSoldierCount += 1;
			}
			for(var fArtilleryIndex in fArtillery)
			{
				if (fArtillery[fArtilleryIndex].health > 0) fArtilleryCount += 1;
			}
			for(var eArtilleryIndex in eArtillery)
			{
				if (eArtillery[eArtilleryIndex].health > 0) eArtilleryCount += 1;
			}
			for(var fArrowTowerIndex in fArrowTowers)
			{
				if (fArrowTowers[fArrowTowerIndex].health > 0) fArrowTowersCount += 1;
			}
			
			if (fSoldierCount * 2 < eSoldierCount - 4) type = "soldier"; // Protection against mass soldiers.
			else if (this.now() > 15 && myPoints + enemyPoints < 7 && fSoldierCount < 7 - enemyPoints - myPoints) type = "soldier"; // Capture!
			else if (eArtilleryCount === 0 && fArrowTowersCount < 1 && nearestGoliath !== null && this.distanceTo(nearestGoliath) < 30) type = "arrow-tower"; // No enemy artillery?  Tower up!
			else if (fArcherCount >= eArcherCount + 2 && fArcherCount > 2 && fArtilleryCount < 2 && lastArtillerySpawn < this.now()) type = "artillery"; // Maintain up to 2 artillery.
			else if (fArcherCount > 8 && fSoldierCount < 2) type = "soldier"; // Meat Shield.
			else type = "archer"; // Shoot things.  Things die.
		}
		else
		{
			// Game start is always the same, so we can just hard-code the startup.
			type = initialBuildOrder[this.built.length];
		}

		if (this.gold >= this.costOf(type))
		{
			if(nearestGoliath !== null) buildPos = Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(this.pos, nearestGoliath.pos)), 5), this.pos);
			else buildPos = this.pos;
			if(nearestGoliath !== null && this.now() < 10 && type == "artillery") buildPos = Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(nearestGoliath.pos, this.pos)), 6), this.pos);
			if (this.getEscapeVector(this.pos, this.pos, dangerZones, 16, 0, "goliath") !== false) break;

			if(type == "artillery") lastArtillerySpawn = this.now() + 5; // Induce a spawning cooldown for artillery so we don't spawn too many in a row
			if(type == "arrow-tower" && this.distanceTo(home) >= 30 && nearestGoliath !== null && this.health * 1.75 < nearestGoliath.health)
			{
				// If it looks like I'm getting pressured by the enemy, put a tower between us and retreat.
				// If the enemy has simple pathing logic, the tower will act as a block.
				retreat = this.now() + 20;
			}
			this.buildXY(type, buildPos.x, buildPos.y);
			// HACK
			if(type == "artillery") this.siege([this.built[this.built.length-1]], this.pos);
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
	if (nearestEnemy !== null)
	{
		// If the goliath wants to get up close and personal, make sure he has difficulty spawning archers,
		// since archers are really the only ones that can outrun the goliath.
		if (this.findNearest(this.findByType("ice-yak", enemies)) !== null)
		{
			this.move(home);
			return;
		}
		if(this.isReady("throw"))
		{
			if (nearestArtillery !== null && this.distanceTo(nearestArtillery) < 25) this.throw(nearestArtillery);
			else if (nearestTower !== null && this.distanceTo(nearestTower) < 25) this.throw(nearestTower);
			else if (nearestArcher !== null && this.distanceTo(nearestArcher) < 25 && nearestGoliath.gold < 25)
			{
				this.blocking();
				this.throw(nearestArcher);
			}
		}
		if(nearestGoliath !== null && (this.health * 1.75 < nearestGoliath.health || retreat > this.now()))
		{
			if (nearestTower !== null && this.distanceTo(nearestTower) < 10 && this.distanceTo(home) > 75)
			{
				this.attack(nearestTower);
				return;
			}
			if (nearestGoliath !== null && this.distanceTo(nearestGoliath) < 15 && this.isReady("hurl"))
			{
				if (this.distanceTo(mid) > 40 && this.distanceTo(mid) > nearestGoliath.pos.distance(mid)) this.hurl(nearestGoliath, throwPoint);
			}
			this.move(Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(this.pos, nearestGoliath.pos)), 10), this.pos));
			return;
		}
		if (nearestTower !== null && this.distanceTo(nearestTower) < 25)
		{
			this.attack(nearestTower);
			return;
		}
		if (nearestArcher !== null && this.distanceTo(nearestArcher) < 7)
		{
			this.attack(nearestArcher);
			return;
		}
		if (nearestSoldier !== null && this.distanceTo(nearestSoldier) < 3)
		{
			this.attack(nearestSoldier);
			return;
		}
		
		var numInStompRange = 0;
		for(var eIndex in enemies)
		{
			if (this.distanceTo(enemies[eIndex]) <= 15 && (enemies[eIndex].Type == "soldier" || enemies[eIndex].Type == "archer")) numInStompRange += 1;
		}

		if (nearestArtillery !== null && this.distanceTo(nearestArtillery) < 5) this.attack(nearestArtillery);
		if (numInStompRange >= 3 && this.isReady("stomp")) this.stomp();
		if (nearestGoliath !== null && this.distanceTo(away) < away.distance(nearestGoliath.pos) && this.isReady("stomp")) this.stomp();
		var nearestPoint = this.findNearest(points);
		
		// Prepare the vector to throw the enemy goliath away from a control point, thereby allowing me to take control.
		var throwPoint = Vector.add(Vector.subtract(this.pos, nearestPoint.pos), this.pos);
		if (nearestGoliath !== null &&
			this.distanceTo(nearestGoliath) < 8 &&
			nearestPoint.pos.distance(this.pos) > nearestPoint.pos.distance(nearestGoliath.pos) &&
			this.isReady("hurl"))
				this.hurl(nearestGoliath, throwPoint);

		if (this.distanceTo(nearestEnemy) < 25 && nearestEnemy.type != "archer" && nearestEnemy.type != "goliath") this.attack(nearestEnemy);
		else if (this.distanceTo(restPoint) < 10) this.attack(nearestEnemy);
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
	if (nearestGoliath !== null) dangerZones.push({ "Point": nearestGoliath.pos, "Radius": 15, "Type": nearestGoliath.type});
	if (nearestGoliath !== null && this.distanceTo(nearestGoliath) < 25 && this.isReady("hurl")) 
	{
		var oppSlamPoint = Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(this.pos, nearestGoliath.pos)), 8), this.pos);
		dangerZones.push({ "Point": oppSlamPoint, "Radius": 17, "Type": nearestGoliath.type});
	}
	for (var i = 0; i < missiles.length; ++i) 
	{
		var missile = missiles[i];
		if (missile.type == "shell") dangerZones.push({ "Point": missile.targetPos, "Radius": 17, "Type": missile.type});
		else if (missile.type == "boulder") dangerZones.push({ "Point": missile.targetPos, "Radius": 12, "Type": missile.type});
		// { "x": 45, "y": 35, "z":12.0 }
	}
	var enemySoldiers = this.findByType("soldier", enemies);
	for (var soldierIndex in enemySoldiers) 
	{
		var enemy = enemySoldiers[soldierIndex];
		dangerZones.push({ "Point": enemy.pos, "Radius": 6, "Type": enemy.type});
	}
	var enemyTowers = this.findByType("arrow-tower", enemies);
	for (var towerIndex in enemyTowers) 
	{
		if(enemyTowers[towerIndex].target !== null && enemyTowers[towerIndex].target.type != "archer") continue;
		enemy = enemyTowers[towerIndex];
		dangerZones.push({ "Point": enemy.pos, "Radius": 30, "Type": enemy.type});
	}
	// Probably no longer used, because I found a better mechanism.  This was originally intended to scatter my archers but it proved to be too buggy.
	myGoliathZone = [{ "Point": this.pos, "Radius": 10, "Type": this.type}];
};

// This is where things get serious.  Pathfinding logic to keep my fast units out of dangerous areas, and solve then
// path it should travel to avoid danger, and get closer to the target destination simultaneously.  No more bouncing
// back and forth, but running along the perimeter.  This nearly guarantees that my archer forces will be superior
// to the enemy.
this.getEscapeVector = function(pos, tar, dangerObjects, atkRange, minRange, excludeType)
{
	var summedVector = new Vector(0, 0);
	var targetPos = Vector.add(pos, Vector.multiply(Vector.normalize(Vector.subtract(tar, pos)), 10));
	var inDanger = false;
	var headingToDanger = false;

	var divisor = 0;
	for(var dangerZoneKey in dangerObjects)
	{
		if(dangerObjects[dangerZoneKey].Type == excludeType) continue;
		if (pos.distance(dangerObjects[dangerZoneKey].Point) <= dangerObjects[dangerZoneKey].Radius)
		{
			inDanger = true;
			summedVector = Vector.add(summedVector, dangerObjects[dangerZoneKey].Point);
			divisor += 1;
		}
		else if (targetPos.distance(dangerObjects[dangerZoneKey].Point) <= dangerObjects[dangerZoneKey].Radius && tar.distance(targetPos) >= atkRange - 5)
		{
			headingToDanger = true;
			summedVector = Vector.add(summedVector, dangerObjects[dangerZoneKey].Point);
			divisor += 1;
		}
	}
	if (divisor === 0) return false;
	
	var averagedSum = Vector.divide(summedVector, divisor);
	// var avgPoint = Vector.divide(Vector.add(pos, targetPos), 2);
	
	var myPoint = Vector.subtract(pos, averagedSum);
	var rotation = myPoint.heading();
	var clampedBearing = Vector.rotate(Vector.subtract(targetPos, averagedSum), -rotation);
	
	var newHeading = null;
	if(clampedBearing.y >= 0) newHeading = new Vector(0, 1);
	else newHeading = new Vector(0, -1);
	
	newHeading = Vector.rotate(newHeading, rotation);
	
	if(this.now() <= 3) return Vector.normalize(Vector.subtract(pos, averagedSum)); // Scatter
	if(inDanger === false && headingToDanger === true) return newHeading; // Run on tangent
	if(inDanger === true && headingToDanger === true) return Vector.normalize(Vector.subtract(pos, averagedSum)); // Get Out
	return Vector.normalize(Vector.add(Vector.normalize(Vector.subtract(pos, averagedSum)), newHeading)); // Escape on tangent
};

// When a unit is spawned, we assign it a job, by adding to the array, or replacing
// a dead unit.
this.assignJobs = function()
{
	var newbieUnit = this.built[this.built.length-1];
	for(var jobQueueKey in jobQueue)
	{
		if (jobQueue[jobQueueKey].Members.length < jobQueue[jobQueueKey].TargetSize)
		{
			for(var role in roles[newbieUnit.type])
			{
				if (roles[newbieUnit.type][role] == jobQueue[jobQueueKey].Job)
				{
					// this.say(roles[newbieUnit.type][role]);
					if (jobQueue[jobQueueKey].Job == "Capture" && points[jobQueue[jobQueueKey].Quadrant].team == enemyTeam) continue;
					jobQueue[jobQueueKey].Members.push(newbieUnit);
					assignedJobIndex += 1;
					return;
				}
			}
		}
		else
		{
			// This is nearly identical, but it replaces an element in the array, instead of appends.  Gotta replace the dead.
			for(role in roles[newbieUnit.type])
			{
				for(var memberKey in jobQueue[jobQueueKey].Members)
				{
					if (roles[newbieUnit.type][role] == jobQueue[jobQueueKey].Job && jobQueue[jobQueueKey].Members[memberKey].health <= 0)
					{
						// this.say(jobQueue[jobQueueKey].Job);
						if (jobQueue[jobQueueKey].Job == "Capture" && points[jobQueue[jobQueueKey].Quadrant].team == enemyTeam) continue;
						jobQueue[jobQueueKey].Members[memberKey] = newbieUnit;
						assignedJobIndex += 1;
						return;
					}
				}
			}
		}
	}
};

// Capture and defend the point.  Escape if under siege.
this.capturePoint = function(friends, quadrant)
{
	var fNearestThreat = friends[0].findNearest(this.findByType("archer", enemies));
	var distance = 999;
	if (fNearestThreat !== null) distance = friends[0].distanceTo(fNearestThreat);

	for(var allyCaptureJobIndex in friends)
	{
		var friend = friends[allyCaptureJobIndex];
		var targetPos = points[quadrant].pos;
		if(friend.type != "soldier") escapeVector = this.getEscapeVector(friend.pos, friend.pos, dangerZones, 25, 0, "none");
		else escapeVector = this.getEscapeVector(friend.pos, friend.pos, dangerZones, 25, 0, "soldier");
		
		if(this.now() < 5)
		{
			this.command(friend, "move", targetPos);
			continue;
		}
		if(escapeVector === false)
		{
			this.command(friend, "defend", targetPos);
			continue;
		}

		var destination = Vector.add(friend.pos, Vector.multiply(escapeVector, 10));
		if (fNearestThreat !== null && distance <= 30 && friend.pos.distance(targetPos) < 10)
		{
			this.command(friend, "defend", targetPos);
		}
		else
		{
			this.command(friend, "move", destination);
		}		
	}
};

// Attack!  Stay out of fire!  DIE!
this.assault = function(friends)
{
	var combinedEscapeVector = false;
	var averagedVectorPos = false;
	var assaultMembers = [];
	var nearbyArchers = [];
	var enemyArchers = this.findByType("archer", enemies);
	
	// This originally was intended to allow a pair of archers to simultaneously target the same enemy, since I wanted my archers to work in pairs.
	// Looks like most of the logic for this case isn't used, but it's too dangerous for me to change it.
	for(var friendIndex in friends)
	{
		var friend = friends[friendIndex];
		if (friend.health <= 0 && friend.type == "artillery") continue; // A hack for when there was a bugh with AssignJobs.  The health check is necessary, but the artillery check shouldn't be.
		assaultMembers.push(friend);

		// Not used.  Was meant to make the archers within the same group escape on the same vector.  getEscapeVector has been improved to the point where it doesn't matter anymore.
		if (averagedVectorPos === false) averagedVectorPos = friend.pos;
		averagedVectorPos = Vector.divide(Vector.add(averagedVectorPos, friend.pos), 2);

		var fNearestArcher = friend.findNearest(this.findByType("archer", enemies));
		if (fNearestArcher !== null) nearbyArchers.push(fNearestArcher);
	}

	var alternator = 1;
	for(var memberIndex in assaultMembers)
	{
		friend = assaultMembers[memberIndex];

		var fNearestThreat = null;
		
		var nearestThreat = friend.findNearest(this.findByType("artillery", enemies));
		if(nearestThreat === null || friend.distanceTo(nearestThreat) > 25) nearestThreat = friend.findNearest("arrow-tower", enemies);
		if(nearestThreat === null || friend.distanceTo(nearestThreat) > 25) nearestThreat = friend.findNearest(enemyArchers);
		if(nearestThreat === null || friend.distanceTo(nearestThreat) > 25) nearestThreat = nearestArtillery;
		if(nearestThreat === null || friend.distanceTo(nearestThreat) > 35) nearestThreat = friend.findNearest(enemies);
		if(nearestThreat === null) nearestThreat = nearestGoliath;

		// Early-game, this is to split my archer forces in half, so that they will effectively go around the enemy goliath
		// and pincer the enemy.  In addition, it generally gets them close enough to the north/south capture point to also
		// deny the opponent that spot.
		if(this.now() <= 6)
		{
			if (alternator === 0)
			{
				alternator = 1;
				escapeVector = this.getEscapeVector(friend.pos, new Vector(85, 25), dangerZones, 25, 0, "none");
			}
			else 
			{
				alternator = 0;
				escapeVector = this.getEscapeVector(friend.pos, new Vector(40, 75), dangerZones, 25, 0, "none");
			}
		}
		else escapeVector = this.getEscapeVector(friend.pos, nearestThreat.pos, dangerZones, 25, 0, "none");

		if(escapeVector === false)
		{
			if(nearestThreat !== null && friend.distanceTo(nearestThreat) < 30)
			{
				this.command(friend, "attack", nearestThreat);
				continue;
			}
			else
			{
				action = "move";
				destination = Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(this.pos, friend.pos)), 10), friend.pos);
			}
		}
		else
		{
			action = "move";
			destination = Vector.add(friend.pos, Vector.multiply(escapeVector, 10));
		}
		this.command(friend, action, destination);
	}
};

// 1. Kill Artillery
// 2. Kill Towers in range
// 3. Siege capture points under enemy control
// 4. Find towers to kill
this.siege = function(friends)
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
		if(eTower[eTowerIndex].team != enemyTeam) continue;  // Hack, otherwise I siege my own tower.  Probably an initialization issue?
		priorityQueue.push(eTower[eTowerIndex]);
		priorityQueueAssigned.push(false);
	}
	for(var pKey in points)
	{
		if (points[pKey].team == enemyTeam && points[pKey].pos.distance(this.pos) > 15)
		{
			priorityQueue.push(points[pKey]);
			priorityQueueAssigned.push(false);
		}
	}
	
	var attackIndex = 0;
	for(var friendIndex in friends)
	{
		var friend = friends[friendIndex];
		if (friend.health <= 0) continue;

		var atkDistance = 999;
		var atkIndex = 0;
		var target = false;
		while(priorityQueue.length > attackIndex && priorityQueue.length > 0)
		{
			if (friend.pos.distance(priorityQueue[attackIndex].pos) < atkDistance && friend.pos.distance(priorityQueue[attackIndex].pos) > 15 && priorityQueueAssigned[attackIndex] === false)
			{
				if (priorityQueue[attackIndex].type == "artillery" && friend.pos.distance(priorityQueue[attackIndex].pos) < 85) atkDistance = 0;
				else if (priorityQueue[attackIndex].type == "arrow-tower") atkDistance = friend.pos.distance(priorityQueue[attackIndex].pos)-10;
				else atkDistance = friend.pos.distance(priorityQueue[attackIndex].pos);
				atkIndex = attackIndex;
				target = priorityQueue[attackIndex];
			}
			attackIndex += 1;
		}
		priorityQueueAssigned[atkIndex] = true;
		
		var restHeading = Vector.add(Vector.multiply(Vector.normalize(Vector.subtract(restPoint, friend.pos)), 10), friend.pos);
		
		escapeVector = this.getEscapeVector(friend.pos, restHeading, dangerZones, 65, 0, "none");
		
		if (target !== false && friend.pos.distance(target.pos) < 65) this.command(friend, "attackPos", target.pos);
		else if (escapeVector !== false) this.command(friend, "move", Vector.add(friend.pos, Vector.multiply(escapeVector, 10)));
		else this.command(friend, "move", restHeading);
	}
};

// Defense logic.  Protect the artillery.
this.defend = function(friends)
{
	var artilleries = this.findByType("artillery", friends);
	var artillery = false;
	for(var artilleryIndex in artilleries)
	{
		if (artilleries[artilleryIndex].health > 0)
		{
			artillery = artilleries[artilleryIndex];
		}
	}
	
	for(var friendIndex in friends)
	{
		friend = friends[friendIndex];
		var eTar = friend.findNearest(this.findByType("archer", enemies));
		if (eTar === null) eTar = friend.findNearest(this.findByType("soldier", enemies));
		if (eTar === null) eTar = friend.findNearest(enemies);
		if (eTar === null) eTar = this;
		if (artillery === false) this.command(friend, "defend", eTar.pos);
		else this.command(friend, "defend", artillery);
	}
};

this.tower = function(friends)
{
	for(var towerIndex in friends)
	{
		friend = friends[towerIndex];
		if(friend.health <= 0) continue;
		var eTar = friend.findNearest(this.findByType("archer", enemies));
		if(eTar === null || friend.distanceTo(eTar) > 30) eTar = friend.findNearest(this.findByType("soldier", enemies));
		if(eTar === null || friend.distanceTo(eTar) > 30) eTar = friend.findNearest(enemies);
		this.command(friend, "attack", eTar);
	}
};

this.blocking = function(friends)
{
	for(var fIndex in friends)
	{
		friend = friends[fIndex];
		if(friend.health <= 0) continue;
		var eTar = friend.findNearest(enemies);
		if(eTar === null || friend.distanceTo(eTar) > 25) this.command(friend, "move", friend.pos);
		else this.command(friend, "attack", eTar);
	}
};

loop {
	var fArcherCount = 0;
	var dangerZones = [];
	// dangerZones.push(nearestGoliath.pos);
	var points = this.getControlPoints();
	for(var pKey in points)
	{
		if (points[pKey].team == enemyTeam) enemyPoints += 1;
		else if (points[pKey].team == this.team) myPoints += 1;
	}
	
	var missiles = this.findByType("shell", this.findEnemyMissiles())
		.concat(this.findByType("boulder", this.findEnemyMissiles()))
		.concat(this.findByType("shell", this.findFriendlyMissiles()))
		.concat(this.findByType("boulder", this.findFriendlyMissiles()));
	this.buildArmy();

	var friends = this.built;
	var enemies = this.findEnemies();
	var nearestEnemy = this.findNearest(enemies);
	var nearestArcher = this.findNearest(this.findByType("archer", enemies));
	var nearestSoldier = this.findNearest(this.findByType("soldier", enemies));
	var nearestTower = this.findNearest(this.findByType("arrow-tower", enemies));
	var nearestArtillery = this.findNearest(this.findByType("artillery", enemies));
	var myPoints = 0;
	var enemyPoints = 0;

	this.findDangerZones();
	this.tower(this.findByType("arrow-tower", friends));

	for(var jobQueueKey in jobQueue)
	{
		if (jobQueue[jobQueueKey].Members.length === 0) continue;
		else if (jobQueue[jobQueueKey].Job == "Capture") this.capturePoint(jobQueue[jobQueueKey].Members, jobQueue[jobQueueKey].Quadrant);
		else if (jobQueue[jobQueueKey].Job == "Assault") this.assault(jobQueue[jobQueueKey].Members);
		else if (jobQueue[jobQueueKey].Job == "Siege") this.siege(jobQueue[jobQueueKey].Members, jobQueue[jobQueueKey].RestPoint);
		else if (jobQueue[jobQueueKey].Job == "Defend") this.defend(jobQueue[jobQueueKey].Members);
	}
	this.controlHero();
}
