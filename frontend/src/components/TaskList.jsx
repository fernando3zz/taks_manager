import { useState } from "react";
import { supabase } from "../../supabaseClient";

// Komponen utama TaskList
const TaskList = ({ tasks = [], onDelete, onUpdateStatus, onEdit, onReplaceFile }) => {
  const [editTaskId, setEditTaskId] = useState(null);
  const [editValues, setEditValues] = useState({
    title: "",
    description: "",
    status: "",
    deadline: "",
    creation_time: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Menangani klik tombol Edit
  const handleEditClick = (task) => {
    setEditTaskId(task.id);
    setEditValues({
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline ? task.deadline.slice(0, 16) : "",
      creation_time: task.created_at || task.creation_time,
    });
    setSelectedFile(null);
  };

  // Menyimpan perubahan data tugas
  const handleSaveEdit = () => {
    if (!editTaskId) return;

    if (!editValues.title.trim()) {
      alert("Title tidak boleh kosong!");
      return;
    }

    // Validasi deadline (opsional - hanya jika diisi)
    if (editValues.deadline) {
      const deadlineDate = new Date(editValues.deadline);
      const now = new Date();

      if (isNaN(deadlineDate.getTime())) {
        alert("Tanggal deadline tidak valid!");
        return;
      }

      if (deadlineDate < now) {
        alert("❌ Deadline tidak boleh lebih awal dari waktu sekarang!");
        return;
      }
    }

    const updateData = {
      title: editValues.title.trim(),
      description: editValues.description.trim() || null,
      status: editValues.status,
      deadline: editValues.deadline || null,
    };

    onEdit(editTaskId, updateData);
    setEditTaskId(null);
  };

  // Menangani pemilihan file saat edit
  const handleFileUpload = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Menyimpan file yang diunggah
  const handleSaveFileEdit = () => {
    if (!editTaskId || !selectedFile) {
      console.error("❌ Error: Tidak ada tugas atau file yang dipilih");
      return;
    }

    onReplaceFile?.(editTaskId, selectedFile);
    alert("File berhasil diedit!");
  };

  // 🔧 FUNGSI BARU: Mendapatkan URL file dari Supabase Storage
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    
    const { data } = supabase.storage
      .from("task-files")
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  // 🔧 FUNGSI BARU: Mengecek apakah file adalah gambar
  const isImageFile = (filePath) => {
    if (!filePath) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'];
    return imageExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  };

  // 🔧 FUNGSI DIPERBAIKI: Menampilkan preview file (gambar atau link)
  const renderFilePreview = (filePath) => {
    if (!filePath) return null;

    const fileUrl = getFileUrl(filePath);
    
    // Jika file adalah gambar, tampilkan preview
    if (isImageFile(filePath)) {
      return (
        <div className="mt-2">
          <img
            src={fileUrl}
            alt="File Preview"
            className="w-full max-h-48 object-cover rounded-md border border-gray-300"
            onError={(e) => {
              // Fallback jika gambar gagal dimuat
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-500 underline text-sm hidden"
          >
            View File
          </a>
        </div>
      );
    }

    // Jika bukan gambar, tampilkan link download
    return (
      <a 
        href={fileUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-500 underline"
      >
        View File
      </a>
    );
  };

  // Menentukan status tugas selanjutnya
  const getNextStatus = (status) => {
    return status === "open" ? "in_progress" : "done";
  };

  // Menentukan status tugas sebelumnya
  const getPreviousStatus = (status) => {
    return status === "done" ? "in_progress" : "open";
  };
  
  return (
    <div className="mt-6">
      {tasks.length === 0 ? (
        <p className="text-center text-gray-400">Tidak ada tugas.</p>
      ) : (
        tasks.map((task) => (
          <div key={task.id} className="relative bg-white bg-opacity-10 backdrop-blur-md p-5 rounded-xl shadow-lg z-0">
            {editTaskId === task.id ? (
              <div>
                <input
                  type="text"
                  value={editValues.title}
                  onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                  className="w-full p-2 text-gray-800 border rounded-md"
                />
                <textarea
                  value={editValues.description}
                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                  className="w-full mt-2 p-2 text-gray-800 border rounded-md"
                />
                <input
                  type="datetime-local"
                  value={editValues.deadline}
                  onChange={(e) => setEditValues({ ...editValues, deadline: e.target.value })}
                  className="w-full mt-2 p-2 text-gray-800 border rounded-md"
                />
                <input type="file" onChange={handleFileUpload} className="w-full mt-2 text-gray-800" />
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="mt-2 bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition"
                >
                  ✅ Simpan
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleSaveFileEdit}
                    className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition"
                  >
                    📂 Simpan File
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditTaskId(null)}
                  className="ml-2 bg-gray-400 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-500 transition"
                >
                  ❌ Batal
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                <p className="text-gray-300 mt-1">{task.description}</p>
                {task.creation_time && (
                  <p className="text-sm text-gray-400 mt-1">
                    <strong>Created At:</strong> {new Date(task.creation_time).toLocaleDateString()}
                  </p>
                )}
                {task.deadline && (
                  <p className="text-sm text-gray-400 mt-1">
                    <strong>Deadline:</strong> {new Date(task.deadline).toLocaleDateString()}
                  </p>
                )}
                {/* 🔧 DIPERBAIKI: Tampilkan file_path, bukan filePath */}
                {task.file_path && (
                  <div className="file-preview mt-2">
                    {renderFilePreview(task.file_path)}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-between items-center">
              <div className="flex gap-2">
                {task.status !== "done" && task.status !== "open" && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(task.id, getPreviousStatus(task.status))}
                    className="bg-gray-400 text-white px-2 py-1 rounded-md text-sm hover:bg-gray-500 transition"
                  >
                    {task.status === "in_progress" ? "⬅️ Open" : "⬅️ Kembali"}
                  </button>
                )}
                {task.status !== "done" && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(task.id, getNextStatus(task.status))}
                    className="bg-blue-500 text-white px-2 py-1 rounded-md text-sm hover:bg-blue-600 transition"
                  >
                    {task.status === "open" ? "➡️ In Progress" : "➡️ Done"}
                  </button>
                )}
                {editTaskId !== task.id && task.status !== "done" && (
                  <button
                    type="button"
                    onClick={() => handleEditClick(task)}
                    className="bg-yellow-400 text-white px-2 py-1 rounded-md text-sm hover:bg-yellow-500 transition"
                  >
                    ✏️ Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Apakah Anda yakin ingin menghapus tugas ini?")) {
                      onDelete(task.id);
                    }
                  }}
                  className="text-red-400 hover:text-red-600 transition rounded-full px-2 py-1 text-sm"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskList;