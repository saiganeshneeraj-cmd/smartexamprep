const express = require('express');
const router = express.Router();

// In-memory group store (session-based, resets on server restart)
// For production, replace with MongoDB/Redis
const groups = new Map();
// groups: { groupCode: { name, createdAt, members: [{id, name, branch, avatar, avgScore, joinedAt}] } }

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/leaderboard/create — Create a new group
router.post('/create', (req, res) => {
  const { groupName, memberName, branch, avatar, avgScore, memberId } = req.body;
  if (!groupName || !memberName) return res.status(400).json({ error: 'Group name and your name required' });

  const code = generateCode();
  const member = {
    id: memberId || 'member_' + Date.now(),
    name: memberName,
    branch: branch || 'Student',
    avatar: avatar || '🎓',
    avgScore: avgScore || 0,
    joinedAt: new Date().toISOString(),
    isCreator: true
  };

  groups.set(code, {
    name: groupName,
    code,
    createdAt: new Date().toISOString(),
    members: [member]
  });

  console.log(`✅ Group created: ${groupName} (${code}) by ${memberName}`);
  return res.json({ success: true, code, group: groups.get(code) });
});

// POST /api/leaderboard/join — Join existing group
router.post('/join', (req, res) => {
  const { code, memberName, branch, avatar, avgScore, memberId } = req.body;
  if (!code || !memberName) return res.status(400).json({ error: 'Code and name required' });

  const group = groups.get(code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Group not found! Check the code and try again.' });

  const id = memberId || 'member_' + Date.now();

  // Update if already member, else add
  const existingIdx = group.members.findIndex(m => m.id === id || m.name === memberName);
  if (existingIdx >= 0) {
    group.members[existingIdx] = { ...group.members[existingIdx], avgScore: avgScore || group.members[existingIdx].avgScore, branch, avatar };
  } else {
    group.members.push({ id, name: memberName, branch: branch || 'Student', avatar: avatar || '🎓', avgScore: avgScore || 0, joinedAt: new Date().toISOString(), isCreator: false });
  }

  return res.json({ success: true, group });
});

// GET /api/leaderboard/:code — Get group data
router.get('/:code', (req, res) => {
  const group = groups.get(req.params.code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Group not found' });
  return res.json({ group });
});

// POST /api/leaderboard/update — Update member score
router.post('/update', (req, res) => {
  const { code, memberId, avgScore } = req.body;
  const group = groups.get(code?.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const member = group.members.find(m => m.id === memberId);
  if (member) member.avgScore = avgScore;

  return res.json({ success: true, group });
});

// DELETE /api/leaderboard/leave — Leave group
router.post('/leave', (req, res) => {
  const { code, memberId } = req.body;
  const group = groups.get(code?.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Group not found' });

  group.members = group.members.filter(m => m.id !== memberId);
  if (group.members.length === 0) groups.delete(code.toUpperCase());

  return res.json({ success: true });
});

module.exports = router;
