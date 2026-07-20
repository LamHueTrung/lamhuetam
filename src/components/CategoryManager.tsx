import React, { useState } from "react";
import { Icon } from "@mdi/react";
import { mdiClose, mdiPlus, mdiDeleteOutline, mdiDragVertical, mdiChevronUp, mdiChevronDown, mdiCheck, mdiPalette } from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence, Reorder } from "motion/react";
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

export default function CategoryManager({ isOpen, onClose, categories, onAdd, onUpdate, onDelete, onReorder }: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Tag");
  const [editColor, setEditColor] = useState("slate");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("Tag");
  const [newColor, setNewColor] = useState("slate");

  const [categoryList, setCategoryList] = useState(categories);

  React.useEffect(() => {
    setCategoryList(categories);
  }, [categories]);

  const handleReorder = (reordered: Category[]) => {
    setCategoryList(reordered);
    onReorder(reordered.map(c => c._id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-end justify-center"
          onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] max-h-[85vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon path={mdiPalette} size={1.25} className="text-slate-700" />
                <h2 className="text-base font-bold text-slate-800">Quản lý danh mục</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddForm(!showAddForm)} className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 cursor-pointer transition-all">
                  <Icon path={showAddForm ? mdiClose : mdiPlus} size={1} />
                </button>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors">
                  <Icon path={mdiClose} size={1.25} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {showAddForm && (
                <div className="bg-slate-50 rounded-[20px] p-4 space-y-3 border border-slate-100">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tên danh mục"
                    className="w-full px-3 py-2.5 bg-white border border-slate-100 rounded-[14px] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {iconNames.map(iconKey => {
                      const IconComp = iconMap[iconKey];
                      const isSelected = newIcon === iconKey;
                      return (
                        <button key={iconKey} onClick={() => setNewIcon(iconKey)}
                          className={`p-2 rounded-xl shrink-0 transition-all cursor-pointer ${isSelected ? 'bg-slate-900 text-white shadow-sm scale-110' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'}`}>
                          {IconComp && <IconComp className="w-5 h-5" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    {colorOptions.map(c => (
                      <button key={c.name} onClick={() => setNewColor(c.name)}
                        className={`w-7 h-7 rounded-full ${c.bg} transition-all cursor-pointer ${newColor === c.name ? `ring-2 ${c.ring} scale-110` : ''}`} />
                    ))}
                  </div>
                  <button onClick={() => { if (!newName.trim()) { toast.error("Nhập tên danh mục"); return; } onAdd(newName.trim(), newIcon, newColor); setNewName(""); setShowAddForm(false); toast.success("Đã thêm danh mục!"); }}
                    className="w-full bg-slate-900 text-white font-bold text-xs py-2.5 rounded-[14px] hover:bg-slate-800 cursor-pointer transition-all">Thêm danh mục</button>
                </div>
              )}

              <Reorder.Group axis="y" values={categoryList} onReorder={handleReorder} className="space-y-2">
                {categoryList.map(cat => {
                  const IconComp = iconMap[cat.icon] || iconMap['Tag'];
                  const isEditing = editingId === cat._id;
                  return (
                    <Reorder.Item key={cat._id} value={cat} className="bg-white border border-slate-100 rounded-[16px] p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing touch-none">
                      <Icon path={mdiDragVertical} size={1} className="text-slate-300 shrink-0" />
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0`} style={{ backgroundColor: cat.color === 'slate' ? '#f1f5f9' : undefined }}>
                        <span className={`px-2 py-1 rounded-lg ${cat.color === 'red' ? 'bg-red-100 text-red-700' : cat.color === 'amber' ? 'bg-amber-100 text-amber-700' : cat.color === 'blue' ? 'bg-blue-100 text-blue-700' : cat.color === 'teal' ? 'bg-teal-100 text-teal-700' : cat.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : cat.color === 'indigo' ? 'bg-indigo-100 text-indigo-700' : cat.color === 'rose' ? 'bg-rose-100 text-rose-700' : cat.color === 'purple' ? 'bg-purple-100 text-purple-700' : cat.color === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                          <IconComp className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold focus:outline-none" />
                        ) : (
                          <span className="text-sm font-bold text-slate-800 block truncate" onClick={() => { setEditingId(cat._id); setEditName(cat.name); setEditIcon(cat.icon); setEditColor(cat.color); }}>{cat.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <button onClick={() => { if (!editName.trim()) { toast.error("Tên không được để trống"); return; } onUpdate({ ...cat, name: editName.trim(), icon: editIcon, color: editColor }); setEditingId(null); toast.success("Đã cập nhật!"); }}
                            className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer transition-all">
                            <Icon path={mdiCheck} size={0.875} />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => onDelete(cat._id)} className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer transition-all">
                              <Icon path={mdiDeleteOutline} size={0.875} />
                            </button>
                          </>
                        )}
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}