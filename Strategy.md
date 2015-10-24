This time around, I had to structure my code more carefully otherwise it would become very difficult to analyze and debug.  To accomplish this, I created a "Job Queue" object to effectively assign jobs to various units.  That way, an archer assigned to "Capture" will focus on capturing, and not assault.  This also means that while my opponent can identify the type of unit I have, it is largely unknown what purpose that unit actually serves.  (See "Roles" table).

The introduction if capture points in this tournament greatly raises the value of artillery and arrow-towers.  In the previous tournament, artillery were largely useless due to the lack of mobility.  However, the Ace of Coders tournament gives value to towers due to desire to hold the capture points, and artillery gains value due to their ability to safely counter towers, and siege the control points.

You can find my code, along with some version history here:
https://github.com/NoJuice4u/CodeCombat-AceOfCoders

General Logic
1. BuildArmy
At the start of the match, I have a hard-coded build strategy of "Artillery", "Archer", "Archer", "Archer", "Archer", "Archer".  Once I build those 6 units, then I switch over to custom logic that depends on various factors:
	a. If the enemy has many soldiers, I produce soldiers.  Attempt to maintain at least half the soldiers the opponent has minus 1.
	b. If there is an empty capture point and we're out of the opening phase of the match, spawn soldiers until we should have enough to capture all uncontested points.
	c. If the enemy has no artillery, and we don't already have an arrow-tower aside from the starting one, spawn an arrow-tower.
	d. Attempt to maintain up to 2 Artillery
	e. Archers.  Shoot first, ask questions later.

Aside from the first artillery, I spawn all my units 5 units away from my position, farthest from the enemy goliath.  That gives the unit the best chance to avoid being one-shot by the goliath after spawning.

2. Control Hero
This is probably the ugliest part of my code.  I can't even guarantee that my point-by-point breakdown is 100% accurate:
	a. If I'm really close to an enemy tower, destroy it.
	b. If my health is much lower than my enemy, run away.  Attempt to "Hurl" the enemy goliath if I'm near the edge, to kite as long as possible.
	c. Smash any archers that is already in melee range, but do not chase.
	d. Smash any soldier that is already in melee range.
	e. Throw a boulder at artillery, if any.
	f. Throw a boulder at arrow-towers, if any.
	g. Throw a boulder at archers, only if the enemy has less than 25 gold (Otherwise we save the cooldown for artillery/arrow-towers)
	h. Smash any artillery
	i. If there's more than 3 enemy units in range, Stomp.
	j. Hurl the enemy goliath to reposition him away from the nearest control point, and it is not under my conrol.  Hurn away from the control point center.
	k. Attack the nearest enemy within 25 units, as long as it's not an archer, or goliath.
	l. Attack the nearest enemy if I am within 10 units of the rest point.
	m. Move to the "Rest Point".

3. FindDangerZones
This is essentially the backbone of my strategy.  While many of the tournament players have a strategy to move their units out of AoE effects, the difference with mine is that I also calculate whether my unit will walk into an AoE effect, and move along the perimeter to get closer to the target, while staying out of danger.  That's why they rarely "bounce in and out".  However, there's a few edge-case issues that cause the bounces to occur when multiple AoE's overlap.  Each "Danger Zone" has a type category and a defined radius, so that I can keep a short distance from soldiers, medium distance from the boulder, and great distance from the artillery shell.
I take these into consideration as "AoE Effects":
- All artillery shells (obviously).
- Goliath throw boulders.
- Enemy Goliath.
- Arrow-Towers that are targeting the unit.
- The farthest point from the enemy goliath that is within 8 units of my goliath, if I am close enough, and hurl is not on cooldown.  (Where I will likely hurl him)
- Enemy Soldiers.

4. GetEscapeVector - this.getEscapeVector = function(pos, tar, dangerObjects, atkRange, minRange, excludeType)
Use the data gathered from "FindDangerZones" to calculate whether to run away from the center of impact, or to walk the perimeter.

5. AssignJobs
Assign the newly spawned unit a job.  No special logic.  It looks at "Roles" to see what unit it's given, and then goes down the Job Queue to find a matching "Job" to assign a unit to.

- If the Job is "Capture", it is mapped to one of the capture points via "Quadrant".  Only 1 unit is assigned this job.
- If the Job is "Assault", nothing particularly special happens here.  One of my original plans was subdividing into groups to be able to execute "Divide and Conquer" tactics, which is why I have 2 groups of 3 instead of 1 group of 6.  However, that level of depth isn't easy.
- If the Job is "Siege", the unit is assigned a "Rest Position" to try to sit at, which is near the middle of the map for maximum coverage.
- If the Job is "Defend", protect the Artillery.  With a size of 100, it's unlikely that I overflow this.

Data Structures
1. Job Queue
```
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
```

2. Roles
```
var roles = {
	"soldier": ["Capture", "Defend"],
	"archer": ["Capture", "Assault", "Guard", "Defend"],
	"artillery": ["Siege"],
	"arrow-tower": ["Tower"]
};
```

Unit Strategy
1. CapturePoint
- Uses getEscapeVector to dodge AoE.
- Move towards the capture point.
- Defend the capture point.

2. Assault
- Uses getEscapeVector to dodge AoE.
- Prioritize artillery within range.  Then, towers, archers, anything else.
- Has custom code for the first few seconds of a match to "Fan out" to prevent all archers going to the same side which would mean we're not pressuring the other side.

3. Siege
- Uses getEscapeVector to dodge AoE.
- Siege any artillery within range + 20.
- Siege any arrow-towers within range.
- Siege any capture points within range.
- Siege nearest capture point owned by enemy.

4. Defend
- Uses getEscapeVector to dodge AoE
- Pick an artillery, and defend it.
- If no artillery, defend something?  (Pretty sure I did someting stupid in the code there but I'm too scared to change it now).

5. Tower
- Priority 1: Archers within range.
- Priority 2: Soldiers within range.
- Priority 3: Anything within range.