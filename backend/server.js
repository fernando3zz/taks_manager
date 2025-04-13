import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import mime from "mime-types"; // Add this import

dotenv.config();

const app = express();

// 🔹 Fix CORS agar mendukung localhost:5173
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// 🔹 Koneksi ke MySQL menggunakan Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoint to handle file uploads
app.post("/upload", upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Move the file to a permanent location
    const targetPath = path.join(__dirname, 'uploads', file.originalname);
    fs.renameSync(file.path, targetPath);

    res.json({ success: true, filePath: `/uploads/${file.originalname}` });
  } catch (error) {
    console.error("❌ Error uploading file:", error.message);
    res.status(500).json({ error: "File upload error" });
  }
});

// Serve static files from the uploads directory
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(__dirname, 'uploads', req.path);
  const mimeType = mime.lookup(filePath);

  if (mimeType) {
    res.setHeader('Content-Type', mimeType);

    // Allow preview for video, PDF, DOCX, and image files
    if (
      mimeType.startsWith("video/") || // Handle video files
      mimeType === "application/pdf" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType.startsWith("image/")
    ) {
      res.setHeader('Content-Disposition', 'inline'); // Set to inline for preview
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`); // Default to download
    }
  }

  next();
}, express.static(path.join(__dirname, 'uploads')));

// Middleware validasi request
const validateTask = (req, res, next) => {
  const { title, description = "", user_id } = req.body;
  if (!title || !user_id) {
    return res.status(400).json({ error: "Title and user_id are required" });
  }
  if (typeof description !== "string") {
    return res.status(400).json({ error: "Description must be a string" });
  }
  next();
};

// 🔹 Ambil tugas berdasarkan user_id dan status (opsional)
app.get("/tasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    if (!userId) return res.status(400).json({ error: "User ID is required" });

    let query = "SELECT id, title, description, status, filePath, creation_time, deadline FROM tasks WHERE user_id = ?";
    const values = [userId];

    if (status) {
      query += " AND status = ?";
      values.push(status);
    }

    console.log("📝 Query:", query);
    console.log("🛠️ Values:", values);

    const [rows] = await pool.execute(query, values);
    res.json(rows); // Ensure `creation_time` is included in the response
  } catch (error) {
    console.error("❌ Error fetching tasks:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

// 🔹 Tambah tugas baru dengan middleware validasi
app.post("/tasks", validateTask, async (req, res) => {
  try {
    const { title, description = "", user_id, status = "open", filePath = null, deadline = null } = req.body;

    console.log("📥 Data diterima di backend:", { title, description, user_id, status, filePath, deadline });

    const [result] = await pool.execute(
      "INSERT INTO tasks (title, description, user_id, status, filePath, deadline) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description.trim(), user_id, status, filePath, deadline]
    );

    // Fetch the newly created task to include all fields in the response
    const [newTask] = await pool.execute(
      "SELECT id, title, description, status, user_id, filePath, deadline, creation_time FROM tasks WHERE id = ?",
      [result.insertId]
    );

    res.json(newTask[0]); // Return the full task object, including the creation_time
  } catch (error) {
    console.error("❌ Error inserting task:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

// 🔹 Update tugas berdasarkan id
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { title, status, description, user_id, filePath, deadline } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Ambil data lama jika title/description tidak dikirim
    const [oldTask] = await pool.execute(
      "SELECT title, description, filePath, deadline FROM tasks WHERE id = ? AND user_id = ?",
      [id, user_id]
    );

    if (!oldTask.length) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    // Gunakan data lama jika tidak dikirim dari frontend
    title = title !== undefined ? title.trim() : oldTask[0].title;
    description = description !== undefined ? description.trim() : oldTask[0].description;
    filePath = filePath !== undefined ? filePath : oldTask[0].filePath;
    deadline = deadline !== undefined ? deadline : oldTask[0].deadline;

    console.log("🔄 Update Task:", { id, title, description, status, user_id, filePath, deadline });

    const validStatuses = ["open", "in_progress", "done"];
    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const query = `UPDATE tasks SET title = ?, description = ?, status = ?, filePath = ?, deadline = ? WHERE id = ? AND user_id = ?`;
    const values = [title, description, status, filePath, deadline, id, user_id];

    console.log("📝 Query:", query);
    console.log("🛠️ Values:", values);

    const [result] = await pool.execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    // Fetch the updated task
    const [updatedTask] = await pool.execute(
      "SELECT id, title, description, status, filePath, deadline FROM tasks WHERE id = ? AND user_id = ?",
      [id, user_id]
    );

    console.log("✅ Updated Task:", updatedTask[0]); // Debugging

    res.json(updatedTask[0]);
  } catch (error) {
    console.error("❌ Error updating task:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

// 🔹 Hapus tugas berdasarkan id
app.delete("/tasks/:id", express.json(), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [result] = await pool.execute(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      [id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Endpoint to handle file replacement
app.put("/tasks/:taskId/file", upload.single("file"), async (req, res) => {
  const { taskId } = req.params;
  const { file } = req;
  const user_id = req.body.user_id;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const targetPath = path.join(__dirname, 'uploads', file.originalname);
    fs.renameSync(file.path, targetPath);

    console.log("📝 Updating task:", { taskId, user_id, filePath: `/uploads/${file.originalname}` });

    const [result] = await pool.execute(
      "UPDATE tasks SET filePath = ? WHERE id = ? AND user_id = ?",
      [`/uploads/${file.originalname}`, taskId, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    res.json({ message: "File berhasil diganti", filePath: `/uploads/${file.originalname}` });
  } catch (error) {
    console.error("❌ Error updating file:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// 🔹 Jalankan server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
