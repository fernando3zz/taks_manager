import { useState } from "react";

// Komponen utama TaskList
const TaskList = ({ tasks = [], onDelete, onUpdateStatus, onEdit, onReplaceFile }) => {
  const [editTaskId, setEditTaskId] = useState(null); // Menyimpan ID tugas yang sedang diedit
  const [editValues, setEditValues] = useState({
    title: "",
    description: "",
    status: "",
    deadline: "",
    creation_time: "",
  });
  const [selectedFile, setSelectedFile] = useState(null); // Menyimpan file yang dipilih saat edit

  // Menangani klik tombol Edit — mengisi form dengan data tugas yang dipilih
  const handleEditClick = (task) => {
    setEditTaskId(task.id);
    setEditValues({
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      creation_time: task.creation_time,
    });
    setSelectedFile(null); // Reset file yang dipilih
  };

  // Menyimpan perubahan data tugas
  const handleSaveEdit = () => {
    if (!editTaskId) return;

    // Validasi input kosong
    if (!editValues.title.trim() || !editValues.description.trim()) {
      alert("Title dan Deskripsi tidak boleh kosong!");
      return;
    }

    // Konversi tanggal dari string ke objek Date
    const deadlineDate = new Date(editValues.deadline);
    const creationDate = new Date(editValues.creation_time);

    // Validasi jika tanggal tidak valid
    if (isNaN(deadlineDate.getTime()) || isNaN(creationDate.getTime())) {
      alert("Tanggal tidak valid!");
      return;
    }

    // Validasi jika deadline lebih awal dari tanggal dibuat
    if (deadlineDate < creationDate) {
      alert("❌ Deadline tidak boleh lebih awal dari tanggal dibuat!");
      return;
    }

    // Siapkan data baru dan kirim ke parent melalui onEdit
    const updateData = {
      title: editValues.title.trim(),
      description: editValues.description.trim(),
      status: editValues.status,
      deadline: editValues.deadline,
    };

    onEdit(editTaskId, updateData);
    alert("Perubahan berhasil disimpan!");
    setEditTaskId(null); // Keluar dari mode edit
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

    // Panggil fungsi dari parent jika tersedia
    onReplaceFile?.(editTaskId, selectedFile);
    alert("File berhasil diedit!");
  };

  // Menampilkan tautan pratinjau file
  const renderFilePreview = (filePath) => {
    const fileUrl = `http://localhost:5000${filePath}`;
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
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
                {/* form Input untuk mengedit judul tugas */}
                <input
                  type="text"
                  value={editValues.title}
                  onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                  className="w-full p-2 text-gray-800 border rounded-md"
                />
                {/* Input untuk mengedit deskripsi tugas */}
                <textarea
                  value={editValues.description}
                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                  className="w-full mt-2 p-2 text-gray-800 border rounded-md"
                />
                {/* Input untuk mengedit deadline tugas */}
                <input
  type="date"
  value={editValues.deadline}
  onChange={(e) => setEditValues({ ...editValues, deadline: e.target.value })}
  min={editValues.creation_time?.slice(0, 10)} 
  className="w-full mt-2 p-2 text-gray-800 border rounded-md"
/>

                {/* Input untuk mengunggah file */}
                <input type="file" onChange={handleFileUpload} className="w-full mt-2 text-gray-800" />
                {/* Tombol untuk menyimpan perubahan */}
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="mt-2 bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition"
                >
                  ✅ Simpan
                </button>
                {/* Tombol untuk menyimpan file */}
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleSaveFileEdit}
                    className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition"
                  >
                    📂 Simpan File
                  </button>
                )}
                {/* Tombol untuk membatalkan edit */}
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
                {/* Informasi Tugas */}
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
                {task.filePath && <div className="file-preview mt-2">{renderFilePreview(task.filePath)}</div>}
              </div>
            )}

            {/* Tombol Aksi */}
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