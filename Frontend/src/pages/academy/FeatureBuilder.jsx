import { motion as Motion } from "framer-motion";
import { Database, Shield, Server, Monitor, CheckCircle2, ArrowDown } from "lucide-react";
import CodeBlock from "./shared/CodeBlock";

const legoBlocks = [
  {
    id: "model",
    title: "1. The Database Brick: Comment Schema",
    icon: <Database size={18} />,
    color: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5",
    narrative: "Story Chapter 1: The lonely tickets dashboard. Our bug tracking app is live, but users can't communicate about tickets! To fix this, we need to persist comments. We start by creating the Database Schema inside backend/src/models/Comment.js. We define fields referencing the ticket, the author user, the content text, and a mentions list.",
    code: `// backend/src/models/Comment.js
import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  mentions: [{ userId: mongoose.Schema.Types.ObjectId, name: String }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Comment", CommentSchema);`
  },
  {
    id: "policy",
    title: "2. The Security Brick: Ownership Gates",
    icon: <Shield size={18} />,
    color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    narrative: "Story Chapter 2: The comment tampering vulnerability. A junior developer realizes that anyone could edit or delete anyone else's comments via Postman! To protect data integrity, we stack the Access Policy Brick inside backend/src/utils/policy/commentPolicy.js. We declare that updates and deletions are strictly forbidden unless the user is the comment's creator (isSelf) or an Admin.",
    code: `// backend/src/utils/policy/commentPolicy.js
export const commentPolicy = {
  read: async (user, doc) => {
    return true; // Anyone authenticated can read
  },
  create: async (user) => {
    return ["Employee", "Manager", "Admin"].includes(user.role);
  },
  update: async (user, doc) => {
    // Check ownership
    return doc.author.toString() === user._id.toString();
  },
  delete: async (user, doc) => {
    // Only creator or Admin can delete
    return user.role === "Admin" || 
      doc.author.toString() === user._id.toString();
  }
};`
  },
  {
    id: "service",
    title: "3. The Hook Brick: Alert Dispatchers",
    icon: <Server size={18} />,
    color: "border-violet-500/30 text-violet-400 bg-violet-500/5",
    narrative: "Story Chapter 3: Making comments feel alive. We want to send push alerts to team members when they are tagged in comments. We stack the Service Lifecycle Hook Brick inside backend/src/services/comments.js. We export 'beforeCreate' to trim content, and 'afterCreate' to scan for @mentions and queue notifications in the background queue.",
    code: `// backend/src/services/comments.js
export async function beforeCreate({ data, user }) {
  if (!data.content?.trim()) {
    throw new Error("Comment cannot be empty");
  }
  return { ...data, content: data.content.trim(), author: user._id };
}

export async function afterCreate({ doc, user }) {
  // Push notification triggers
  const mentions = doc.mentions || [];
  for (const userMention of mentions) {
    await sendPushNotification({
      userId: userMention.userId,
      title: "New tag in ticket comment",
      body: \`\${user.name} tagged you in comment: \${doc.content}\`
    });
  }
}`
  },
  {
    id: "frontend",
    title: "4. The UI Page Brick: Comment Section",
    icon: <Monitor size={18} />,
    color: "border-amber-500/30 text-amber-400 bg-amber-500/5",
    narrative: "Story Chapter 4: Mounting the comment sections. With the database, safety policies, and alerting triggers configured, we build the final React component on the ticket page. We call the dynamic endpoints '/populate/create/comments' to append comments, and '/populate/read/comments' to load thread lists.",
    code: `// frontend/src/components/CommentSection.jsx
import React, { useState } from "react";
import axiosInstance from "../api/axiosInstance";

export function CommentSection({ ticketId }) {
  const [content, setContent] = useState("");

  const handlePost = async () => {
    const res = await axiosInstance.post("/populate/create/comments", {
      ticket: ticketId,
      content
    });
    // Append the newly created comment object
    setComments(prev => [...prev, res.data.data]);
    setContent("");
  };

  return (
    <div className="space-y-4">
      <textarea value={content} onChange={e => setContent(e.target.value)} />
      <button onClick={handlePost}>Post Comment</button>
    </div>
  );
}`
  }
];

export default function FeatureBuilder() {
  return (
    <section className="relative space-y-16">
      
      {/* Chapter header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
          🧱 Lego Assembler
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-white">
          The Quest to Build Ticket Comments
        </h2>
        <p className="text-slate-400 text-xs md:text-sm">
          Scroll down to travel through the story of a developer implementing comments on bugs, stacking one lego-block component after another.
        </p>
      </div>

      {/* Assembly stack cards */}
      <div className="max-w-4xl mx-auto space-y-12">
        {legoBlocks.map((block, idx) => {
          const Icon = block.icon;
          return (
            <Motion.div
              key={block.id}
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, type: "spring", stiffness: 60, delay: idx * 0.05 }}
              className="grid md:grid-cols-12 gap-6 items-center"
            >
              {/* Text narrative visual info card */}
              <div className="md:col-span-5 space-y-3">
                <div className={`p-3 border rounded-2xl ${block.color} flex items-center gap-3 w-fit shadow-md`}>
                  <div className="p-1.5 bg-slate-950 rounded-lg">
                    {Icon}
                  </div>
                  <h4 className="text-xs font-black text-white">{block.title.split(": ")[0]}</h4>
                </div>
                <h3 className="text-base font-extrabold text-white mt-1">{block.title.split(": ")[1]}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{block.narrative}</p>
              </div>

              {/* Code visual block */}
              <div className="md:col-span-7 bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-lg">
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">Module Code File:</span>
                <CodeBlock code={block.code} />
              </div>
            </Motion.div>
          );
        })}
      </div>

      {/* Verification completed card */}
      <Motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-md mx-auto text-center border border-emerald-500/20 bg-emerald-500/5 p-6 rounded-[24px] mt-12 shadow-xl"
      >
        <div className="flex justify-center mb-2">
          <CheckCircle2 size={24} className="text-emerald-400 animate-bounce" />
        </div>
        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Comments system online</h4>
        <p className="text-[11px] text-slate-350 mt-1 leading-relaxed">
          The database Schema, security policies, hook dispatchers, and UI components are fully stacked. Comment boards are operational on tickets!
        </p>
        <div className="flex justify-center mt-4">
          <ArrowDown className="text-slate-650 animate-bounce" size={16} />
        </div>
      </Motion.div>

    </section>
  );
}