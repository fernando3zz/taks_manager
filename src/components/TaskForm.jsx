import { useState, useEffect } from "react";
import axios from "axios";

const TaskForm = ({ user, onTaskAdded, resetForm }) => {
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [creationTime, setCreationTime] = useState(""); // State untuk waktu pembuatan
  const [deadline, setDeadline] = useState(""); // State untuk tenggat waktu
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null); // State untuk file

  // Reset form setiap kali prop resetForm berubah
  useEffect(() => {
    setNewTask("");
    setNewDescription("");
    setStatus("open");
    setCreationTime(""); // Reset waktu pembuatan
    setDeadline(""); // Reset tenggat waktu
    setFile(null); // Reset input file
  }, [resetForm]);

  // Fungsi untuk menambahkan tugas baru
  const addTask = async () => {
    if (!newTask.trim()) {
      alert("Judul tugas tidak boleh kosong!");
      return;
    }
    if (!user?.id) {
      alert("User tidak ditemukan!");
      return;
    }

    const taskData = {
      title: newTask.trim(),
      description: newDescription.trim(),
      user_id: user.id,
      status,
      deadline: deadline || null, // Pastikan tenggat waktu disertakan, meskipun null
    };

    console.log("📤 Mengirim data ke backend:", taskData); // Debugging

    try {
      setLoading(true);

      // Upload file jika ada
      let filePath = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await axios.post("http://localhost:5000/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        filePath = uploadResponse.data.filePath;
      }

      // Kirim data tugas ke backend
      const response = await axios.post("http://localhost:5000/tasks", { ...taskData, filePath });
      console.log("✅ Response dari backend:", response.data);

      // Panggil callback onTaskAdded untuk memperbarui daftar tugas
      onTaskAdded(response.data);

      // Reset form setelah tugas berhasil ditambahkan
      setNewTask("");
      setNewDescription("");
      setStatus("open");
      setDeadline(""); // Reset tenggat waktu
      setFile(null);
    } catch (error) {
      console.error("❌ Error adding task:", error.response?.data || error.message);
      alert("Gagal menambahkan tugas! Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
      <h3 className="text-lg font-semibold mb-3 text-black">Tambah Tugas</h3>
      {/* Input untuk judul tugas */}
      <input
        type="text"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        placeholder="Judul tugas..."
        className="w-full p-2 border rounded bg-white text-black focus:outline-none mb-2"
        disabled={loading}
      />
      {/* Input untuk deskripsi tugas */}
      <textarea
        value={newDescription}
        onChange={(e) => setNewDescription(e.target.value)}
        placeholder="Deskripsi tugas..."
        className="w-full p-2 border rounded bg-white text-black focus:outline-none mb-2"
        disabled={loading}
      />
      {/* Dropdown untuk status tugas */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full p-2 border rounded bg-white text-black focus:outline-none mb-2"
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
        className="w-full p-2 border rounded bg-white text-black focus:outline-none mb-2"
        disabled={loading}
      />
      {/* Input untuk file */}
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="w-full p-2 border rounded bg-white text-black focus:outline-none mb-2"
        disabled={loading}
      />
      {/* Tombol untuk menambahkan tugas */}
      <button
        type="button"
        onClick={addTask}
        className={`w-full text-white p-2 rounded transition ${
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