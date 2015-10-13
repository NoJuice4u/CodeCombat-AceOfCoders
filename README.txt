[KNOWN ISSUES]
- There's something weird with the escape vector calculations when the target is in multiple danger zones.  It might involve the edge case where the unit is in only one danger zone, but the predicted path sits in another danger zone.  It's been observed that the AI will actually walk into one of the danger zones instead of finding the optimal path out.
- Logic for capturing points is not optimal.  If danger zones exist between the capture point and unit, it bounces for some reason even though it's the same logic as the assault logic.
[Version 14]
- Added a null check.  Stupid nulls.
[Version 13]
- Hacked in a command to spawned artillery to prevent the automatic AI from attacking the first nearest unit, which can cost me the match againt opponents that pause to spawn.
- Hacked in a check so I don't siege my own tower.
- Shuffled the order of some of the logic when I was debugging the "Automatic AI kicking in" issue.  Couldn't figure it out so I hacked a fix instead and was too lazy to revert.
[Version 12]
- Spawn opening artillery closest to opponent for sieging.
- With one of the earlier siege updates, no need to immediately attack a hardcoded position.  It's weak against AI where the enemy pauses to spawn, or moves away to spawn.
- Distance Adjustment.  If the enemy artilllery is within 20 units of the max range, just go after it, instead of risking being shot by it while attacking something else.
[Version 11]
- Removed the gold buffering when near the enemy goliath.
- Now places the arrow-tower away from the enemy goliath.  It was getting killed too quickly.
- Adjusted the distance to target archers.
- Goliath now throws against archers only if the enemy doesn't have enough coins to build an artillery or tower.
- Fixed if statement that should have been else-if
- Adjusted siege logic to prioritize artillery, regardless of distance factor.
- Added runaway logic.  Not sure why I never had this in until now...
- Arrow towers would not attack if it happened to target something outside of range.
- Adjusted the danger range of Boulder.
[Version 10]
- Hooray!  https://github.com/codecombat/codecombat/issues/3062 got fixed!  If you can't beat them, file a bug against them!  I can now go back to the "Artillery", "Archer", "Archer", "Archer" build strategy.
- HA!  I didn't think about tracking my adjustments and bugfixes until now so you won't be able to see how stupid some of the bugs in my code was.  At least I kept the major revisions in the historo so you can go ahead and dig through the history to see for yourself.  Versions 8 and earlier are not guaranteed to work though.  There may be null pointer issues.
[Version 4]
- Where the heck did this file go?  I have no idea.  Whatever, it probably wasn't important.