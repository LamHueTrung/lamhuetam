import React, { useState, useEffect } from "react";
import { Icon } from "@mdi/react";
import {
  mdiAccount,
  mdiAccountCircle,
  mdiBriefcaseOutline,
  mdiSchoolOutline,
  mdiMapMarkerOutline,
  mdiCalendar,
  mdiCodeBraces,
  mdiAlertDecagramOutline,
  mdiPhone,
  mdiEmailOutline,
  mdiPlus,
  mdiTrashCanOutline,
  mdiCheckCircle,
  mdiPencilOutline,
  mdiContentSave,
  mdiAccountBadgeOutline,
  mdiLightbulbOutline,
  mdiOpenInNew,

  mdiClose,
  mdiAutoFix,
  mdiDomain,
  mdiLaptop,
  mdiLayersOutline,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { UserProfile, CustomProfileField } from "../types";

interface UserProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  onNavigateToTab?: (tab: number) => void;
}

export default function UserProfileView({
  profile,
  onUpdateProfile,
  onNavigateToTab,
}: UserProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [dob, setDob] = useState(profile.dob || "");
  const [hometown, setHometown] = useState(profile.hometown || "");
  const [livingContext, setLivingContext] = useState(profile.livingContext || "");
  const [currentJob, setCurrentJob] = useState(profile.currentJob || "");
  const [position, setPosition] = useState(profile.position || "");

  // Skills states
  const [strongestSkill, setStrongestSkill] = useState(
    profile.skills?.strongest || "Node.js"
  );
  const [foundationSkill, setFoundationSkill] = useState(
    profile.skills?.foundation || ""
  );
  const [usedTech, setUsedTech] = useState<string[]>(
    profile.skills?.usedTech || []
  );
  const [companyTech, setCompanyTech] = useState<string[]>(
    profile.skills?.companyTech || []
  );
  const [currentWorry, setCurrentWorry] = useState(
    profile.skills?.currentWorry || ""
  );

  // Tech inputs
  const [newUsedTechInput, setNewUsedTechInput] = useState("");
  const [newCompanyTechInput, setNewCompanyTechInput] = useState("");

  // Education states
  const [school, setSchool] = useState(profile.education?.school || "");
  const [eduStatus, setEduStatus] = useState(profile.education?.status || "");

  // Contact states
  const [avatar, setAvatar] = useState(profile.avatar || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [emails, setEmails] = useState<string[]>(profile.emails || []);
  const [newEmailInput, setNewEmailInput] = useState("");

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomProfileField[]>(
    profile.customFields || []
  );
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [newFieldCategory, setNewFieldCategory] = useState("Sự nghiệp");

  useEffect(() => {
    setFullName(profile.fullName || "");
    setDob(profile.dob || "");
    setHometown(profile.hometown || "");
    setLivingContext(profile.livingContext || "");
    setCurrentJob(profile.currentJob || "");
    setPosition(profile.position || "");

    setStrongestSkill(profile.skills?.strongest || "Node.js");
    setFoundationSkill(profile.skills?.foundation || "");
    setUsedTech(profile.skills?.usedTech || []);
    setCompanyTech(profile.skills?.companyTech || []);
    setCurrentWorry(profile.skills?.currentWorry || "");

    setSchool(profile.education?.school || "");
    setEduStatus(profile.education?.status || "");

    setAvatar(profile.avatar || "");
    setPhone(profile.phone || "");
    setEmails(profile.emails || []);
    setCustomFields(profile.customFields || []);
  }, [profile]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedData: Partial<UserProfile> = {
        fullName,
        dob,
        hometown,
        livingContext,
        currentJob,
        position,
        skills: {
          strongest: strongestSkill,
          foundation: foundationSkill,
          usedTech,
          companyTech,
          currentWorry,
        },
        education: {
          school,
          status: eduStatus,
        },
        avatar,
        phone,
        emails,
        customFields,
      };

      await onUpdateProfile(updatedData);
      toast.success("Đã cập nhật hồ sơ cá nhân thành công!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Lỗi khi lưu hồ sơ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUsedTech = () => {
    if (!newUsedTechInput.trim()) return;
    if (!usedTech.includes(newUsedTechInput.trim())) {
      setUsedTech([...usedTech, newUsedTechInput.trim()]);
    }
    setNewUsedTechInput("");
  };

  const handleRemoveUsedTech = (tech: string) => {
    setUsedTech(usedTech.filter((t) => t !== tech));
  };

  const handleAddCompanyTech = () => {
    if (!newCompanyTechInput.trim()) return;
    if (!companyTech.includes(newCompanyTechInput.trim())) {
      setCompanyTech([...companyTech, newCompanyTechInput.trim()]);
    }
    setNewCompanyTechInput("");
  };

  const handleRemoveCompanyTech = (tech: string) => {
    setCompanyTech(companyTech.filter((t) => t !== tech));
  };

  const handleAddEmail = () => {
    if (!newEmailInput.trim()) return;
    if (!emails.includes(newEmailInput.trim())) {
      setEmails([...emails, newEmailInput.trim()]);
    }
    setNewEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter((e) => e !== emailToRemove));
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) {
      toast.error("Vui lòng nhập cả tên thông tin và nội dung");
      return;
    }
    const newField: CustomProfileField = {
      id: "field-" + Date.now(),
      label: newFieldLabel.trim(),
      value: newFieldValue.trim(),
      category: newFieldCategory,
    };
    setCustomFields([...customFields, newField]);
    setNewFieldLabel("");
    setNewFieldValue("");
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const autoSuggestSuggestions = [
    {
      label: "Định hướng sự nghiệp 1-3 năm",
      category: "Sự nghiệp",
      defaultVal:
        "Lấy lại gốc & làm chủ Node.js nâng cao, xây dựng dự án cá nhân Microservices và hướng tới vị trí Senior Fullstack.",
    },
    {
      label: "Mục tiêu tích lũy & Trả nợ",
      category: "Tài chính",
      defaultVal:
        "Hoàn thành các khoản nợ đúng hạn, giữ khoản dự phòng 6 tháng và gửi tiền hỗ trợ ba mẹ hàng tháng.",
    },
    {
      label: "Phong cách làm việc & Sở thích",
      category: "Cá nhân",
      defaultVal:
        "Đam mê tìm hiểu công nghệ mới, thích thiết kế UI/UX tối ưu trải nghiệm và tối ưu hóa hệ thống API.",
    },
  ];

  const handleApplySuggestion = (sug: { label: string; category: string; defaultVal: string }) => {
    if (customFields.some((f) => f.label === sug.label)) {
      toast("Thông tin này đã có trong danh sách", { icon: "ℹ️" });
      return;
    }
    setCustomFields([
      ...customFields,
      {
        id: "field-" + Date.now(),
        label: sug.label,
        value: sug.defaultVal,
        category: sug.category,
      },
    ]);
    toast.success(`Đã thêm gợi ý "${sug.label}"`);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Top Banner & Header Card */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white rounded-3xl p-5 shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatar ? (
                <img
                  src={avatar}
                  alt={fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md border border-white/20">
                  {fullName ? fullName.split(" ").pop()?.charAt(0) : "T"}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" title="Trực tuyến" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {fullName || "Lâm Huệ Trung"}
                </h1>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Hồ sơ chính chủ
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-1.5">
                <Icon path={mdiBriefcaseOutline} size={0.65} className="text-cyan-400" />
                <span>{position || "Lập trình UI/UX và API"}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Icon path={mdiMapMarkerOutline} size={0.6} className="text-indigo-400" />
                <span>Quê quán: {hometown || "Tiểu Cần - Trà Vinh"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t border-slate-800 sm:border-0">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all disabled:opacity-50"
              >
                <Icon path={mdiContentSave} size={0.75} />
                <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-md cursor-pointer transition-all border border-white/10"
              >
                <Icon path={mdiPencilOutline} size={0.75} />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlight Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Icon path={mdiAutoFix} size={0.65} className="text-amber-400" />
            Thế mạnh:
          </span>

          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg">
            ⚡ {strongestSkill}
          </span>
          <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg">
            🎓 K21 ĐH Trà Vinh
          </span>
          <span className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg">
            🏢 {currentJob.split(" tại ")[1] || "Rynan Tech"}
          </span>
        </div>
      </div>

      {/* SECTION 1: Hồ sơ nhân vật của tôi */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
              <Icon path={mdiAccountBadgeOutline} size={0.9} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Hồ sơ nhân vật của tôi
              </h2>
              <p className="text-[11px] text-slate-400">
                Thông tin lý lịch cá nhân và bối cảnh sống thực tế
              </p>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày sinh
              </label>
              <input
                type="text"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nghề nghiệp hiện tại
              </label>
              <input
                type="text"
                value={currentJob}
                onChange={(e) => setCurrentJob(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vị trí công việc
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quê quán
              </label>
              <input
                type="text"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bối cảnh sống & Áp lực
              </label>
              <textarea
                rows={2}
                value={livingContext}
                onChange={(e) => setLivingContext(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Họ và tên
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {fullName}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Ngày sinh
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Icon path={mdiCalendar} size={0.7} className="text-cyan-500" />
                {dob}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Nghề nghiệp hiện tại
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {currentJob}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Vị trí đảm nhận
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {position}
              </p>
            </div>
            <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-amber-500/5 to-rose-500/5 dark:from-amber-950/20 dark:to-rose-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-900/30">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Icon path={mdiMapMarkerOutline} size={0.65} />
                Quê quán & Bối cảnh sống
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {livingContext}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Kỹ năng chuyên môn & Nỗi lo */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Icon path={mdiCodeBraces} size={0.9} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Kỹ năng chuyên môn & Nỗi lo hiện tại
              </h2>
              <p className="text-[11px] text-slate-400">
                Công nghệ làm chủ, kinh nghiệm và trăn trở sự nghiệp
              </p>
            </div>
          </div>
        </div>

        {/* Strongly highlight Node.js & Foundation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              🚀 Kỹ năng mạnh nhất
            </span>
            {isEditing ? (
              <input
                type="text"
                value={strongestSkill}
                onChange={(e) => setStrongestSkill(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 outline-none"
              />
            ) : (
              <p className="text-base font-black text-emerald-900 dark:text-emerald-200">
                {strongestSkill}
              </p>
            )}
          </div>

          <div className="p-3.5 bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-900/40 rounded-2xl">
            <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider block mb-1">
              🎨 Tư duy & Nền tảng
            </span>
            {isEditing ? (
              <input
                type="text"
                value={foundationSkill}
                onChange={(e) => setFoundationSkill(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-cyan-300 rounded-lg text-xs font-medium text-cyan-800 dark:text-cyan-300 outline-none"
              />
            ) : (
              <p className="text-xs font-semibold text-cyan-900 dark:text-cyan-200">
                {foundationSkill}
              </p>
            )}
          </div>
        </div>

        {/* Công nghệ đã từng dùng */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>🛠️ Công nghệ đã từng dùng:</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({usedTech.length} công nghệ)
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            {usedTech.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                {tech}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveUsedTech(tech)}
                    className="text-rose-400 hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    <Icon path={mdiClose} size={0.5} />
                  </button>
                )}
              </span>
            ))}

            {isEditing && (
              <div className="flex items-center gap-1 mt-1 w-full">
                <input
                  type="text"
                  value={newUsedTechInput}
                  onChange={(e) => setNewUsedTechInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUsedTech())}
                  placeholder="Thêm công nghệ (VD: Docker)..."
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddUsedTech}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700"
                >
                  Thêm
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Công nghệ làm chủ yếu ở công ty */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>🏢 Công nghệ làm chủ yếu ở công ty (Rynan):</span>
          </label>
          <div className="flex flex-wrap gap-1.5 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/40 dark:border-amber-900/30">
            {companyTech.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-semibold px-2.5 py-1 rounded-xl border border-amber-300/50 dark:border-amber-800/50"
              >
                {tech}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveCompanyTech(tech)}
                    className="text-rose-500 hover:text-rose-700 cursor-pointer ml-0.5"
                  >
                    <Icon path={mdiClose} size={0.5} />
                  </button>
                )}
              </span>
            ))}

            {isEditing && (
              <div className="flex items-center gap-1 mt-1 w-full">
                <input
                  type="text"
                  value={newCompanyTechInput}
                  onChange={(e) => setNewCompanyTechInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCompanyTech())}
                  placeholder="Thêm công nghệ ở công ty..."
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCompanyTech}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-amber-700"
                >
                  Thêm
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Nỗi lo hiện tại Card */}
        <div className="p-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 dark:from-rose-950/30 dark:via-amber-950/30 dark:to-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Icon path={mdiAlertDecagramOutline} size={0.8} />
              Nỗi lo hiện tại & Định hướng dài hạn
            </span>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab(5)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Icon path={mdiAutoFix} size={0.65} />
                Hỏi Cố Vấn AI
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea
              rows={2}
              value={currentWorry}
              onChange={(e) => setCurrentWorry(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none"
            />
          ) : (
            <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 leading-relaxed italic">
              "{currentWorry}"
            </p>
          )}
        </div>
      </div>

      {/* SECTION 3: Học vấn */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <Icon path={mdiSchoolOutline} size={0.9} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Trình độ Học vấn
            </h2>
            <p className="text-[11px] text-slate-400">
              Trường học, khóa học và trạng thái bằng cấp
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trường / Khóa học
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái tốt nghiệp
              </label>
              <input
                type="text"
                value={eduStatus}
                onChange={(e) => setEduStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-0.5">
                Trường đào tạo
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {school}
              </p>
            </div>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                Trạng thái bằng cấp
              </span>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Icon path={mdiCheckCircle} size={0.7} className="text-emerald-500" />
                {eduStatus}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: Avatar, Số điện thoại & Nhiều Email */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
            <Icon path={mdiPhone} size={0.9} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              4. Avatar & Thông tin liên hệ
            </h2>
            <p className="text-[11px] text-slate-400">
              Quản lý số điện thoại và danh sách nhiều địa chỉ Email
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Avatar URL / Image */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Link Ảnh Avatar
            </label>
            {isEditing ? (
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              />
            ) : (
              <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate">
                {avatar || "(Chưa đặt link avatar)"}
              </p>
            )}
          </div>

          {/* Số điện thoại */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Số điện thoại
            </label>
            {isEditing ? (
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0399123456"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              />
            ) : (
              <p className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-1.5">
                <Icon path={mdiPhone} size={0.7} className="text-cyan-500" />
                {phone || "Chưa cập nhật SĐT"}
              </p>
            )}
          </div>

          {/* Danh sách nhiều Email */}
          <div className="sm:col-span-2 space-y-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>✉️ Danh sách địa chỉ Email ({emails.length}):</span>
            </label>
            <div className="space-y-1.5">
              {emails.map((email, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Icon path={mdiEmailOutline} size={0.7} className="text-indigo-500" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {email}
                    </span>
                    {idx === 0 && (
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md">
                        Chính
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="text-rose-400 hover:text-rose-600 cursor-pointer p-1"
                      title="Xóa email này"
                    >
                      <Icon path={mdiTrashCanOutline} size={0.7} />
                    </button>
                  )}
                </div>
              ))}

              {isEditing && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEmail())}
                    placeholder="Nhập email mới..."
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Icon path={mdiPlus} size={0.7} />
                    <span>Thêm Email</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Tự gợi ý & Quản lý thông tin cá nhân khác */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Icon path={mdiLightbulbOutline} size={0.9} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                5. Thông tin cá nhân mở rộng & Định hướng
              </h2>
              <p className="text-[11px] text-slate-400">
                Tùy chỉnh thông tin bổ sung để Cố Vấn AI hiểu bạn sâu sắc hơn
              </p>
            </div>
          </div>
        </div>

        {/* Auto-suggest buttons */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Icon path={mdiAutoFix} size={0.65} className="text-amber-500" />
            Gợi ý thông tin nên bổ sung cho Cố vấn AI:
          </span>

          <div className="flex flex-wrap gap-2">
            {autoSuggestSuggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleApplySuggestion(sug)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              >
                <Icon path={mdiPlus} size={0.65} className="text-cyan-600" />
                <span>+ {sug.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Existing Custom Fields */}
        <div className="space-y-3">
          {customFields.map((field) => (
            <div
              key={field.id}
              className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  {field.label}
                  {field.category && (
                    <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                      {field.category}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleRemoveCustomField(field.id)}
                  className="text-slate-400 hover:text-rose-500 cursor-pointer p-1 transition-colors"
                  title="Xóa trường này"
                >
                  <Icon path={mdiTrashCanOutline} size={0.7} />
                </button>
              </div>

              {isEditing ? (
                <textarea
                  rows={2}
                  value={field.value}
                  onChange={(e) => {
                    const updated = customFields.map((f) =>
                      f.id === field.id ? { ...f, value: e.target.value } : f
                    );
                    setCustomFields(updated);
                  }}
                  className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                />
              ) : (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium pt-0.5">
                  {field.value}
                </p>
              )}
            </div>
          ))}

          {/* Add custom field form */}
          <div className="p-3.5 bg-slate-100/70 dark:bg-slate-800/80 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ➕ Thêm trường thông tin tự định nghĩa:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Tên thông tin (VD: Mức lương kỳ vọng)..."
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white sm:col-span-2"
              />
              <select
                value={newFieldCategory}
                onChange={(e) => setNewFieldCategory(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              >
                <option value="Sự nghiệp">Sự nghiệp</option>
                <option value="Tài chính">Tài chính</option>
                <option value="Cá nhân">Cá nhân</option>
                <option value="Gia đình">Gia đình</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder="Nội dung chi tiết..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddCustomField}
              className="w-full py-2 bg-gradient-to-r from-slate-900 to-indigo-900 hover:from-slate-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Icon path={mdiPlus} size={0.7} />
              <span>Xác nhận thêm thông tin này</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
          >
            <Icon path={mdiContentSave} size={0.9} />
            <span>{isSaving ? "Đang lưu..." : "Lưu toàn bộ hồ sơ"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
