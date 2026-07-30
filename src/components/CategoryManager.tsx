import React, { useState } from "react";
import { Icon } from "@mdi/react";
import { mdiClose, mdiPlus, mdiDeleteOutline, mdiDragVertical, mdiChevronUp, mdiChevronDown, mdiCheck, mdiPalette } from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence, Reorder, useDragControls } from "motion/react";
import { Category } from "../types";
import { iconMap, iconNames } from "../lib/iconMap";

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAdd: (name: string, icon: string, color: string) => void;
  onUpdate: (cat: Category) => void;
  onDelete: (_id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

const colorOptions = [
  { name: 'red', bg: 'bg-red-100', ring: 'ring-red-400' },
  { name: 'amber', bg: 'bg-amber-100', ring: 'ring-amber-400' },
  { name: 'blue', bg: 'bg-blue-100', ring: 'ring-blue-400' },
  { name: 'teal', bg: 'bg-teal-100', ring: 'ring-teal-400' },
  { name: 'emerald', bg: 'bg-emerald-100', ring: 'ring-emerald-400' },
  { name: 'indigo', bg: 'bg-indigo-100', ring: 'ring-indigo-400' },
  { name: 'rose', bg: 'bg-rose-100', ring: 'ring-rose-400' },
  { name: 'purple', bg: 'bg-purple-100', ring: 'ring-purple-400' },
  { name: 'orange', bg: 'bg-orange-100', ring: 'ring-orange-400' },
  { name: 'slate', bg: 'bg-slate-100', ring: 'ring-slate-400' },
];

// Sub-component for individual category items to have their own drag controls
function CategoryItemRow({
  cat,
  isEditing,
  editName,
  setEditName,
  onUpdate,
  onDelete,
  setEditingId,
  editIcon,
  editColor,
}: {
  cat: Category;
  isEditing: boolean;
  editName: string;
  setEditName: (val: string) => void;
  onUpdate: (cat: Category) => void;
  onDelete: (id: string) => void;
  setEditingId: (id: string | null) => void;
  editIcon: string;
  editColor: string;
}) {
  const dragControls = useDragControls();
  const IconComp = iconMap[cat.icon || "Tag"];

  return (
    <Reorder.Item
      value={cat}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-100 rounded-2xl select-none"
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Drag Handle */}
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 hover:bg-slate-200/50 rounded-lg transition-colors shrink-0 touch-none select-none"
        >
          <Icon path={mdiDragVertical} size={0.875} className="text-slate-400" />
        </div>
        <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-700 shrink-0">
          {IconComp ? <IconComp className="w-4 h-4" /> : <Icon path={mdiPalette} size={0.75} />}
        </div>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold flex-1"
          />
        ) : (
          <div
            className="flex flex-col cursor-pointer"
            onClick={() => {
              setEditingId(cat._id);
              setEditName(cat.name);
            }}
          >
            <span className="text-xs font-bold text-slate-800">{cat.name}</span>
            <span className="text-[9px] font-semibold text-slate-400">
              {cat.type === "income" ? "Khoản thu" : "Khoản chi"}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isEditing ? (
          <button
            onClick={() => {
              if (!editName.trim()) {
                toast.error("Tên không được để trống");
                return;
              }
              onUpdate({ ...cat, name: editName.trim(), icon: editIcon, color: editColor });
              setEditingId(null);
              toast.success("Đã cập nhật!");
            }}
            className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer"
          >
            <Icon path={mdiCheck} size={0.75} />
          </button>
        ) : (
          <button
            onClick={() => onDelete(cat._id)}
            className="p-1.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer"
          >
            <Icon path={mdiDeleteOutline} size={0.75} />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}

export default function CategoryManager({ isOpen, onClose, categories, onAdd, onUpdate, onDelete, onReorder }: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Tag");
  const [editColor, setEditColor] = useState("slate");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("Tag");
  const [newColor, setNewColor] = useState("slate");
  const [newType, setNewType] = useState<"expense" | "income">("expense");

  const [categoryList, setCategoryList] = useState(categories);
  const dragControlsCat = useDragControls();

  React.useEffect(() => {
    setCategoryList(categories);
  }, [categories]);

  const handleReorder = (reordered: Category[]) => {
    setCategoryList(reordered);
    onReorder(reordered.map(c => c._id));
  };

  const handleAddCategory = () => {
    if (!newName.trim()) {
      toast.error("Vui lòng nhập tên danh mục");
      return;
    }
    onAdd(newName.trim(), newIcon, newColor);
    setNewName("");
    setNewColor("slate");
    setNewIcon("Tag");
    setNewType("expense");
    setShowAddForm(false);
    toast.success("Đã thêm danh mục!");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-end justify-center"
          onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            drag="y"
            dragControls={dragControlsCat}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 200) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] max-h-[85vh] flex flex-col overflow-hidden z-10">
            <div 
              onPointerDown={(e) => { e.stopPropagation(); dragControlsCat.start(e); }}
              onTouchStart={(e) => { e.stopPropagation(); }}
              style={{ touchAction: "none" }}
              className="sticky top-0 bg-white/90 backdrop-blur-md z-10 p-5 pb-3 border-b border-slate-100 flex flex-col shrink-0 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon path={mdiPalette} size={1.25} className="text-slate-700" />
                  <h2 className="text-base font-bold text-slate-800">Quản lý danh mục</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAddForm(!showAddForm)} className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 cursor-pointer transition-all">
                    <Icon path={showAddForm ? mdiClose : mdiPlus} size={1} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              {showAddForm && (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Thêm danh mục mới</span>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tên danh mục..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => setNewType("expense")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${newType === "expense" ? "bg-rose-500 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>Khoản chi</button>
                    <button onClick={() => setNewType("income")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${newType === "income" ? "bg-emerald-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>Khoản thu</button>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Màu sắc:</span>
                    <div className="flex items-center gap-1.5">
                      {colorOptions.map((c) => (
                        <button key={c.name} onClick={() => setNewColor(c.name)} className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c.name ? "border-slate-900 scale-110" : "border-transparent"}`} style={{ backgroundColor: c.name === "red" ? "#ef4444" : c.name === "amber" ? "#f59e0b" : c.name === "blue" ? "#3b82f6" : c.name === "emerald" ? "#10b981" : c.name === "purple" ? "#8b5cf6" : c.name === "rose" ? "#f43f5e" : c.name === "indigo" ? "#6366f1" : c.name === "teal" ? "#14b8a6" : c.name === "orange" ? "#f97316" : "#64748b" }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddCategory} className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer transition-all">Lưu danh mục</button>
                </div>
              )}

              <Reorder.Group axis="y" values={categoryList} onReorder={handleReorder} className="space-y-2">
                {categoryList.map((cat) => (
                  <CategoryItemRow
                    key={cat._id}
                    cat={cat}
                    isEditing={editingId === cat._id}
                    editName={editName}
                    setEditName={setEditName}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    setEditingId={setEditingId}
                    editIcon={editIcon}
                    editColor={editColor}
                  />
                ))}
              </Reorder.Group>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}