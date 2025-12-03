import { useState, useEffect, useRef } from "react";
import axios from "axios";

const TaskForm = ({ user, onTaskAdded, resetForm }) => {
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  // Reset form setiap kali prop resetForm berubah
  useEffect(() => {
    setNewTask("");
    setNewDescription("");
    setStatus("open");
    setDeadline("");
    setFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resetForm]);

  // Fungsi untuk menambahkan tugas baru
  const addTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validasi input
    if (!newTask.trim()) {
      setError("Judul tugas wajib diisi!");
      setLoading(false);
      return;
    }

    // Validasi deadline
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      if (deadlineDate < now) {
        setError("Deadline tidak boleh lebih awal dari waktu sekarang!");
        setLoading(false);
        return;
      }
    }

    try {
      let uploadedFilePath = null;

      // 1. Upload file terlebih dahulu (jika ada)
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_id", user.id);

        console.log("📤 Uploading file untuk user:", user.id);

        const uploadResponse = await axios.post(
          "http://localhost:5000/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" }
          }
        );

        if (uploadResponse.data.success) {
          uploadedFilePath = uploadResponse.data.file_path;
          console.log("✅ File uploaded:", uploadedFilePath);
        }
      }

      // 2. Simpan task ke database
      const taskData = {
        title: newTask.trim(),
        description: newDescription.trim() || null,
        user_id: user.id,
        status: status,
        deadline: deadline || null,
        file_path: uploadedFilePath
      };

      console.log("📤 Mengirim data task ke backend:", taskData);

      const response = await axios.post(
        "http://localhost:5000/tasks",
        taskData,
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      console.log("✅ Task berhasil disimpan:", response.data);

      // Reset form
      setNewTask("");
      setNewDescription("");
      setStatus("open");
      setDeadline("");
      setFile(null);
      setError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Callback
      if (onTaskAdded) {
        onTaskAdded();
      }

    } catch (err) {
      console.error("❌ Error adding task:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Gagal menambahkan tugas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
      <h3 className="text-lg font-semibold mb-3 text-black">Tambah Tugas</h3>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3">
          {error}
        </div>
      )}

      {/* Input untuk judul tugas */}
      <input
        type="text"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        placeholder="Judul tugas..."
        className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        disabled={loading}
        required
      />

      {/* Input untuk deskripsi tugas */}
      <textarea
        value={newDescription}
        onChange={(e) => setNewDescription(e.target.value)}
        placeholder="Deskripsi tugas..."
        className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        rows="3"
        disabled={loading}
      />

      {/* Dropdown untuk status tugas */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        disabled={loading}
      >
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      {/* Input untuk tenggat waktu */}
      <input
        type="datetime-local"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        placeholder="Tenggat waktu"
        className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        disabled={loading}
        min={new Date().toISOString().slice(0, 16)}
      />

      {/* Input untuk file */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => setFile(e.target.files[0])}
        className="w-full p-2 border rounded bg-white text-black focus:outline-none mb-2"
        disabled={loading}
      />

      {/* Tampilkan nama file yang dipilih */}
      {file && (
        <p className="text-sm text-gray-600 mb-2">
          File dipilih: {file.name}
        </p>
      )}

      {/* Tombol untuk menambahkan tugas */}
      <button
        type="button"
        onClick={addTask}
        className={`w-full text-white p-2 rounded transition font-medium ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
        }`}
        disabled={loading}
      >
        {loading ? "Menambahkan..." : "Tambahkan"}
      </button>
    </div>
  );
};

export default TaskForm;