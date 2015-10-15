[KNOWN ISSUES]
- There's something weird with the escape vector calculations when the target is in multiple danger zones.  It might involve the edge case where the unit is in only one danger zone, but the predicted path sits in another danger zone.  It's been observed that the AI will actually walk into one of the danger zones instead of finding the optimal path out.  Very likely happens when transitioning between number of danger zones, the average vector can "jump" to the other side of the unit, causing the vector calculations to be thrown off.  Need some kind of area solver to address this.  That's probably not the correct words, but I know what I mean.
- Logic for job assinment for capture points is not optimal.  Would benefit if it assigned to the nearest free capture point, rather then down the list.  The benefit is only minor, since we've sorted the capture points.
- Escape Vector calculations should include enemy archer range, and make sure my units stay out of enemy range when it's escaping.  Currently has a risk of escaping and entering enemy range which leaves them vulnerable.
- Siege strategy attempts to prevent multiple artillery from sieging the same point at the same time.  That obviously isn't working.  Even better, would be forward prediction so that it doesn't siege a spot that we can expect to be cleared out if we estimate that the target under siege is going to die.  Right now, it often sieges the same spot once more due to timing issues.
- Rest point calculations for artillery is probably wrong since they converge on the same spot.  The rest point is supposed to separate them a bit to increase siege coverage.
- Soldiers could probably benefit from attacking the lowest-health target if more than one target is within melee range.
- The "Blocking" protection against throw is hard-coded for archers.  Should be extended to include Artillery.
- Defend logic was a lazy attempt, since it only happens when I have an abundance of units.
[Version 16]
- My stupid soldiers were running away from enemy soldiers.  Stupid cowardly soldiers.
- Ice Yak Protection.
- The throw command prevents execution for 1 second apparently, which is dangerous for any unit that is in executing "AttacK" but out of range.  They risk over-extending because the "Attack" they are given is effectively a move, so they won't start attacking until we regain control.  Therefore, I stop all my archers if the game is early enough to prevent the opponent from getting a lucky, critical lead against me during this brief moment of vulnerability.
- Extended the initial build order, because it would sometimes spawn a soldier.  It's too early to spawn a capture point soldier at this point.
[Version 15]
- Added a danger zone near the vector that I would throw the enemy giant if hurl is available so I don't help my opponent aoe my units.
- Possible fix for the weird escape vector calculations?  Brain not quite working right now...
- Maybe it was doubling up on daner zones.  Changed an if to else-if
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