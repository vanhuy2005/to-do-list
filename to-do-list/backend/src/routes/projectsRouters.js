import express from "express";
import Project from "../models/Project.js";
import User from "../models/User.js";

const router = express.Router();

// list projects the user can see
router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const projects = await Project.find({
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    }).lean();
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch projects" } });
  }
});

// create project
router.post("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, visibility } = req.body;
    const project = new Project({
      ownerId: userId,
      name,
      description,
      visibility: visibility || "private",
      members: [
        { userId, role: "owner", addedBy: userId, addedAt: new Date() },
      ],
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not create project" } });
  }
});

// get project
router.get("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    const project = await Project.findById(req.params.id).lean();
    if (!project)
      return res.status(404).json({ error: { message: "Not found" } });

    const isMember =
      String(project.ownerId) === String(userId) ||
      (project.members || []).some((m) => String(m.userId) === String(userId));
    if (!isMember)
      return res.status(403).json({ error: { message: "Forbidden" } });

    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch project" } });
  }
});

// update project (owner only)
router.patch("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: { message: "Not found" } });
    if (String(project.ownerId) !== String(userId))
      return res
        .status(403)
        .json({ error: { message: "Only owner can update" } });

    const { name, description, visibility, settings } = req.body;
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (visibility !== undefined) project.visibility = visibility;
    if (settings !== undefined) project.settings = settings;

    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update project" } });
  }
});

// delete project (owner only)
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: { message: "Not found" } });
    if (String(project.ownerId) !== String(userId))
      return res
        .status(403)
        .json({ error: { message: "Only owner can delete" } });

    await project.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete project" } });
  }
});

// add member by email (owner only)
router.post("/:id/members", async (req, res) => {
  try {
    const userId = req.userId;
    const { email, role } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: { message: "Not found" } });
    if (String(project.ownerId) !== String(userId))
      return res
        .status(403)
        .json({ error: { message: "Only owner can invite" } });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ error: { message: "User not found" } });

    // prevent duplicates
    if (
      (project.members || []).some((m) => String(m.userId) === String(user._id))
    ) {
      return res.status(400).json({ error: { message: "Already a member" } });
    }

    project.members.push({
      userId: user._id,
      role: role || "viewer",
      addedBy: userId,
      addedAt: new Date(),
    });
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not add member" } });
  }
});

// update member role (owner only)
router.patch("/:id/members/:memberId", async (req, res) => {
  try {
    const userId = req.userId;
    const { role } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: { message: "Not found" } });
    if (String(project.ownerId) !== String(userId))
      return res
        .status(403)
        .json({ error: { message: "Only owner can update members" } });

    const member =
      project.members.id(req.params.memberId) ||
      project.members.find((m) => String(m.userId) === req.params.memberId);
    if (!member)
      return res.status(404).json({ error: { message: "Member not found" } });
    member.role = role;
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update member" } });
  }
});

// remove member (owner only)
router.delete("/:id/members/:memberId", async (req, res) => {
  try {
    const userId = req.userId;
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: { message: "Not found" } });
    if (String(project.ownerId) !== String(userId))
      return res
        .status(403)
        .json({ error: { message: "Only owner can remove members" } });

    // try by subdoc id or by userId
    const before = project.members.length;
    project.members = project.members.filter(
      (m) =>
        String(m._id) !== req.params.memberId &&
        String(m.userId) !== req.params.memberId,
    );
    if (project.members.length === before)
      return res.status(404).json({ error: { message: "Member not found" } });
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not remove member" } });
  }
});

export default router;
