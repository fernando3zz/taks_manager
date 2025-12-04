// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();
app.use(cors({ 
  origin: [
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://fernando3zz-taksmanager.vercel.app"  // 👈 Tambahkan domain Vercel Anda
  ] 
}));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

/* ------------------------------
  Create Task (INSERT)
-------------------------------*/
app.post("/tasks", async (req, res) => {
  try {
    console.log("📥 Menerima request create task:", req.body);
    
    const { title, description, status, user_id, file_path, deadline } = req.body;

    // Validasi input
    if (!title || !user_id) {
      return res.status(400).json({ error: "Title dan user_id wajib diisi" });
    }

    const taskData = {
      title,
      description: description || null,
      status: status || "open",
      user_id,
      file_path: file_path || null,
      deadline: deadline || null
    };

    console.log("📤 Data yang akan disimpan:", taskData);

    const { data, error } = await supabase
      .from("tasks")
      .insert([taskData])
      .select("*");

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    console.log("✅ Task berhasil disimpan:", data[0]);
    res.json(data[0]);
  } catch (err) {
    console.error("❌ Error saat create task:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------
  Upload file (untuk TaskForm)
-------------------------------*/
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("📤 Upload file request received");
    
    if (!req.file) {
      return res.json({ success: true, file_path: null });
    }

    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: "user_id required" });
    }

    const filename = `${Date.now()}-${req.file.originalname}`;
    const file_path = `uploads/${filename}`;

    console.log("📁 Uploading file:", filename);

    const { error: uploadError } = await supabase.storage
      .from("task-files")
      .upload(file_path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("task-files")
      .getPublicUrl(file_path);

    console.log("✅ File uploaded successfully:", file_path);

    res.json({ 
      success: true, 
      file_path: file_path,
      url: data.publicUrl 
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

/* ------------------------------
  Get tasks by user (SELECT)
  - supports optional ?status=open
-------------------------------*/
app.get("/tasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = supabase
      .from("tasks")
      .select("id,title,description,status,file_path,created_at,deadline")
      .eq("user_id", userId);
    
    if (status) query = query.eq("status", status);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message || "Database error" });
  }
});

/* ------------------------------
  Update task (UPDATE)
-------------------------------*/
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload.user_id) return res.status(400).json({ error: "user_id required" });

    // ensure the row belongs to user
    const { data: existing, error: getErr } = await supabase
      .from("tasks")
      .select("user_id")
      .eq("id", id)
      .single();

    if (getErr) throw getErr;
    if (!existing || existing.user_id !== payload.user_id) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        title: payload.title ?? undefined,
        description: payload.description ?? undefined,
        status: payload.status ?? undefined,
        file_path: payload.file_path ?? undefined,
        deadline: payload.deadline ?? undefined
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message || "Database error" });
  }
});

/* ------------------------------
  Delete task (DELETE)
-------------------------------*/
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    // check ownership
    const { data: existing, error: getErr } = await supabase
      .from("tasks")
      .select("user_id")
      .eq("id", id)
      .single();
      
    if (getErr) throw getErr;
    if (!existing || existing.user_id !== user_id) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message || "Database error" });
  }
});

/* ------------------------------
  Replace file for a task (upload to Supabase Storage)
-------------------------------*/
app.put("/tasks/:taskId/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { taskId } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    // ownership check
    const { data: existing, error: getErr } = await supabase
      .from("tasks")
      .select("user_id")
      .eq("id", taskId)
      .single();
      
    if (getErr) throw getErr;
    if (!existing || existing.user_id !== user_id) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    const filename = `${Date.now()}-${req.file.originalname}`;
    const file_path = `uploads/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("task-files")
      .upload(file_path, req.file.buffer, {
        contentType: req.file.mimetype
      });
      
    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("task-files")
      .getPublicUrl(file_path);

    // update DB
    const { error: updateErr } = await supabase
      .from("tasks")
      .update({ file_path: file_path })
      .eq("id", taskId);
      
    if (updateErr) throw updateErr;

    res.json({ success: true, file_path: file_path, url: data.publicUrl });
  } catch (err) {
    console.error("Replace file error:", err);
    res.status(500).json({ error: err.message || "Storage error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));