import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import projectService from "@/services/projectService";
import authService from "@/services/authService";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "sonner";
import {
  UsersIcon,
  MailIcon,
  LinkIcon,
  KeyIcon,
  CopyIcon,
  CheckIcon,
  Trash2Icon,
  CrownIcon,
  UserMinusIcon,
  AlertTriangleIcon,
  FolderIcon,
} from "lucide-react";

export default function ProjectMembersModal({
  open,
  onOpenChange,
  project,
  onMembersUpdated,
}) {
  const [activeTab, setActiveTab] = useState("members"); // "members" | "email" | "invites"
  
  // Email Invite state
  const [email, setEmail] = useState("");
  const [emailRole, setEmailRole] = useState("viewer");
  const [isInviting, setIsInviting] = useState(false);

  // Link Invite state
  const [linkRole, setLinkRole] = useState("viewer");
  const [maxUses, setMaxUses] = useState(10);
  const [expireDays, setExpireDays] = useState(7);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // Code Invite state
  const [codeRole, setCodeRole] = useState("viewer");
  const [isCreatingCode, setIsCreatingCode] = useState(false);

  // Copy states
  const [copiedLinkId, setCopiedLinkId] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const currentUser = authService.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  
  // Find current user's membership role
  const myMembership = project?.members?.find((m) => {
    const mId = m.userId?._id || m.userId;
    return mId === currentUserId;
  });
  
  const myRole = myMembership?.role || (project?.ownerId === currentUserId ? "owner" : "viewer");
  const isOwner = project?.ownerId?._id === currentUserId || project?.ownerId === currentUserId;
  const canManage = isOwner || myRole === "editor";

  // Trigger copy to clipboard
  const handleCopyText = (text, type, id = "") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLinkId(id);
      setTimeout(() => setCopiedLinkId(""), 2000);
    } else if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    toast.success("Đã sao chép vào bộ nhớ tạm!");
  };

  // 1. Invite by Email
  async function handleInviteEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsInviting(true);
    try {
      await projectService.addMember(project._id, {
        email: email.trim(),
        role: emailRole,
      });
      toast.success("Đã gửi lời mời và thêm thành viên thành công!");
      setEmail("");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Không thể gửi lời mời.");
    } finally {
      setIsInviting(false);
    }
  }

  // 2. Change Member Role
  async function handleRoleChange(memberId, newRole) {
    try {
      await projectService.updateMember(project._id, memberId, { role: newRole });
      toast.success("Đã cập nhật vai trò thành viên!");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Cập nhật vai trò thất bại.");
    }
  }

  // 3. Remove Member
  async function handleRemoveMember(memberId) {
    if (!confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?")) return;
    try {
      await projectService.removeMember(project._id, memberId);
      toast.success("Đã xóa thành viên khỏi dự án.");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Xóa thành viên thất bại.");
    }
  }

  // 4. Transfer Ownership
  async function handleTransferOwnership(targetUserId) {
    if (!confirm("CẢNH BÁO: Bạn sẽ chuyển quyền sở hữu dự án này cho người khác. Bạn sẽ bị hạ cấp xuống Editor. Bạn có chắc chắn?")) return;
    try {
      await projectService.transferOwnership(project._id, targetUserId);
      toast.success("Đã chuyển giao quyền sở hữu dự án thành công!");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Chuyển giao quyền sở hữu thất bại.");
    }
  }

  // 5. Generate Share Link
  async function handleCreateLink(e) {
    e.preventDefault();
    setIsCreatingLink(true);
    try {
      const expiresAt = expireDays ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString() : null;
      await projectService.createShareLink(project._id, {
        role: linkRole,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt,
      });
      toast.success("Tạo link mời an toàn thành công!");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Tạo link mời thất bại.");
    } finally {
      setIsCreatingLink(false);
    }
  }

  // 6. Revoke Share Link
  async function handleRevokeLink(linkId) {
    try {
      await projectService.revokeShareLink(project._id, linkId);
      toast.success("Đã thu hồi link mời lập tức!");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Thu hồi link mời thất bại.");
    }
  }

  // 7. Generate Invite Code
  async function handleCreateCode(e) {
    e.preventDefault();
    setIsCreatingCode(true);
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days default
      await projectService.generateInviteCode(project._id, {
        role: codeRole,
        expiresAt,
      });
      toast.success("Tạo mã mời 6 ký tự thành công!");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Tạo mã mời thất bại.");
    } finally {
      setIsCreatingCode(false);
    }
  }

  // 8. Revoke Invite Code
  async function handleRevokeCode() {
    try {
      await projectService.revokeInviteCode(project._id);
      toast.success("Đã hủy bỏ mã mời lập tức!");
      onMembersUpdated && onMembersUpdated(true);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Hủy mã mời thất bại.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border-4 border-border bg-card !p-0 !gap-0 rounded-[2rem] comic-shadow">
        <DialogHeader className="!m-0 border-b-[3px] border-border bg-[#ff3b57] px-6 py-4 text-white shrink-0 flex flex-col gap-1">
          <DialogTitle className="text-2xl font-black uppercase text-white flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5"><FolderIcon className="size-6 text-white fill-white/20 stroke-[2.5]" /> Thiết Lập Không Gian</span>
            <Badge className="border-[2px] border-white/50 bg-[#ffd400] text-foreground text-xs uppercase px-2 font-black">
              Dự án: {project?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Tab Buttons (Pop Art Style) */}
        <div className="px-6 mt-4 shrink-0">
          <div className="flex gap-2 p-1 border-[3px] border-border rounded-xl bg-white comic-shadow">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black uppercase rounded-lg border-2 border-transparent transition-all ${
                activeTab === "members"
                  ? "bg-[#00C2FF] text-white border-border comic-shadow -translate-y-0.5"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <UsersIcon className="size-4" />
              Thành viên ({(project?.members || []).length})
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab("email")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black uppercase rounded-lg border-2 border-transparent transition-all ${
                    activeTab === "email"
                      ? "bg-[#FF2D55] text-white border-border comic-shadow -translate-y-0.5"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <MailIcon className="size-4" />
                  Mời Email
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("invites")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black uppercase rounded-lg border-2 border-transparent transition-all ${
                    activeTab === "invites"
                      ? "bg-[#7DE228] text-foreground border-border comic-shadow -translate-y-0.5"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <LinkIcon className="size-4" />
                  Mã & Link Mời
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
          
          {/* TAB 1: MEMBERS LIST */}
          {activeTab === "members" && (
            <div className="space-y-3">
              {project?.members?.map((m) => {
                const memberUser = m.userId;
                const memberId = memberUser?._id || memberUser;
                const isMe = memberId === currentUserId;
                const isMemberOwner = memberId === project?.ownerId?._id || memberId === project?.ownerId;
                
                return (
                  <div
                    key={memberId}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border-[3px] border-border rounded-2xl bg-white comic-shadow hover:scale-[1.01] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar
                          avatarUrl={memberUser?.avatarUrl}
                          displayName={memberUser?.displayName}
                          email={memberUser?.email}
                          sizeClassName="size-10"
                          textClassName="text-sm font-black"
                        />
                        {isMemberOwner && (
                          <div className="absolute -top-1.5 -right-1.5 bg-[#ffd400] border-2 border-border rounded-full p-0.5">
                            <CrownIcon className="size-3 text-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-sm uppercase text-foreground truncate">
                          {memberUser?.displayName || (m.isPending ? "Đang chờ chấp nhận" : "Người dùng ẩn danh")}{" "}
                          {isMe && <span className="text-[10px] bg-[#ffd400] text-foreground border border-border px-1 rounded font-black uppercase">Bạn</span>}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground truncate">
                          {memberUser?.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Role selection / Badge */}
                      {m.isPending ? (
                        <div className="flex items-center gap-1.5">
                          <Badge className="border-2 border-border bg-[#ffd400] text-foreground uppercase font-black text-[10px] px-2 py-0.5 animate-pulse">
                            Đang chờ
                          </Badge>
                          <Badge className="border-2 border-border bg-[#f1f5f9] text-muted-foreground uppercase font-black text-[10px] px-2 py-0.5">
                            {m.role}
                          </Badge>
                        </div>
                      ) : isOwner && !isMe ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(memberId, e.target.value)}
                          className="h-8 text-xs font-black uppercase rounded-lg border-2 border-border bg-white px-2 py-0.5 comic-shadow cursor-pointer"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="comment">Commenter</option>
                          <option value="editor">Editor</option>
                        </select>
                      ) : (
                        <Badge className={`border-2 border-border uppercase font-black text-[10px] px-2 py-0.5 ${
                          isMemberOwner 
                            ? "bg-[#ffd400] text-foreground" 
                            : m.role === "editor" 
                              ? "bg-[#00C2FF] text-white" 
                              : "bg-[#f1f5f9] text-muted-foreground"
                        }`}>
                          {isMemberOwner ? "Chủ dự án" : m.role}
                        </Badge>
                      )}

                      {/* Owner actions (Transfer & Remove) */}
                      {isOwner && !isMe && (
                        <div className="flex gap-1.5">
                          {!m.isPending && (
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="secondary"
                              onClick={() => handleTransferOwnership(memberId)}
                              title="Chuyển quyền sở hữu"
                              className="bg-[#ffd400] hover:bg-[#ffd400]/95"
                            >
                              <CrownIcon className="size-3 text-foreground" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon-xs"
                            onClick={() => handleRemoveMember(memberId)}
                            title={m.isPending ? "Thu hồi lời mời" : "Xóa khỏi dự án"}
                            className="bg-[#ff3b57] hover:bg-[#ff3b57]/90"
                          >
                            <UserMinusIcon className="size-3 text-white" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: EMAIL INVITATIONS */}
          {activeTab === "email" && (
            <div className="space-y-4">
              <form onSubmit={handleInviteEmail} className="p-4 border-[3px] border-border bg-white rounded-2xl comic-shadow space-y-4">
                <h3 className="text-sm font-black uppercase text-foreground flex items-center gap-1.5">
                  <MailIcon className="size-4 text-[#FF2D55]" />
                  Thêm thành viên bằng Email
                </h3>
                <p className="text-xs font-bold text-muted-foreground">
                  Mời người khác bằng tài khoản Email của họ. Họ phải đăng ký tài khoản hệ thống để truy cập.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Email người nhận</label>
                    <Input
                      type="email"
                      required
                      placeholder="workmate@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 border-2 border-border rounded-xl font-bold bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Quyền hạn</label>
                    <select
                      value={emailRole}
                      onChange={(e) => setEmailRole(e.target.value)}
                      className="w-full sm:w-auto h-10 text-xs font-black uppercase rounded-xl border-2 border-border bg-white px-3 comic-shadow cursor-pointer"
                    >
                      <option value="viewer">Viewer (Xem)</option>
                      <option value="comment">Commenter (Nhận xét)</option>
                      <option value="editor">Editor (Chỉnh sửa)</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isInviting}
                  className="w-full h-10 rounded-xl bg-[#FF2D55] text-white uppercase font-black comic-shadow active:translate-y-0.5"
                >
                  {isInviting ? "Đang gửi lời mời..." : "Xác nhận & Thêm"}
                </Button>
              </form>

              <div className="rounded-xl border-[3px] border-dashed border-[#FF2D55]/30 bg-[#FF2D55]/5 p-4 flex gap-2">
                <AlertTriangleIcon className="size-5 text-[#FF2D55] shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-[#c9183b]">HƯỚNG DẪN PHÂN QUYỀN</h4>
                  <ul className="text-[10px] font-bold text-[#c9183b] space-y-1 list-disc list-inside">
                    <li><strong>Editor</strong>: Thêm, sửa, đổi trạng thái và xóa các task của dự án.</li>
                    <li><strong>Commenter</strong>: Có thể xem dự án nhưng không thể tạo hay kéo thả task.</li>
                    <li><strong>Viewer</strong>: Chỉ xem được bảng công việc, không có quyền chỉnh sửa.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINK & CODE INVITES */}
          {activeTab === "invites" && (
            <div className="space-y-6">
              
              {/* SECTION A: 6-CHAR INVITE CODE */}
              <div className="p-4 border-[3px] border-border bg-white rounded-2xl comic-shadow space-y-4">
                <h3 className="text-sm font-black uppercase text-foreground flex items-center gap-1.5">
                  <KeyIcon className="size-4 text-[#7DE228]" />
                  Mã Mời 6 Ký Tự (Invite Code)
                </h3>

                {project?.inviteCode?.code && !project?.inviteCode?.isRevoked ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/20 border-2 border-border rounded-xl">
                      <div className="text-center sm:text-left">
                        <div className="text-[0.6rem] font-black uppercase text-muted-foreground">Mã mời hiện tại</div>
                        <div className="text-3xl font-black uppercase text-[#00C2FF] tracking-wider mt-0.5">{project.inviteCode.code}</div>
                        <div className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center gap-2">
                          <Badge className="border-2 border-border bg-white text-foreground uppercase text-[8px] py-px px-1">
                            Quyền: {project.inviteCode.role}
                          </Badge>
                          <span>Hết hạn: {new Date(project.inviteCode.expiresAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleCopyText(project.inviteCode.code, "code")}
                          className="h-9 rounded-lg border-2 border-border uppercase font-black text-[10px]"
                        >
                          {copiedCode ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                          Sao Chép
                        </Button>
                        {isOwner && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handleRevokeCode}
                            className="h-9 rounded-lg border-2 border-border uppercase font-black text-[10px] bg-[#ff3b57] text-white hover:bg-[#ff3b57]/90"
                          >
                            <Trash2Icon className="size-3" />
                            Hủy Mã
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateCode} className="flex flex-col sm:flex-row items-end gap-3">
                    <div className="flex-1 space-y-1 w-full">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">Quyền hạn cho mã mời</label>
                      <select
                        value={codeRole}
                        onChange={(e) => setCodeRole(e.target.value)}
                        className="w-full h-10 text-xs font-black uppercase rounded-xl border-2 border-border bg-white px-3 comic-shadow cursor-pointer"
                      >
                        <option value="viewer">Viewer (Xem)</option>
                        <option value="comment">Commenter (Nhận xét)</option>
                        <option value="editor">Editor (Chỉnh sửa)</option>
                      </select>
                    </div>
                    <Button
                      type="submit"
                      disabled={isCreatingCode}
                      className="w-full sm:w-auto h-10 px-4 rounded-xl bg-[#7DE228] text-foreground uppercase font-black comic-shadow active:translate-y-0.5"
                    >
                      {isCreatingCode ? "Đang tạo..." : "Tạo mã mời mới"}
                    </Button>
                  </form>
                )}
              </div>

              {/* SECTION B: SHA-256 SECURE SHARE LINKS */}
              <div className="p-4 border-[3px] border-border bg-white rounded-2xl comic-shadow space-y-4">
                <h3 className="text-sm font-black uppercase text-foreground flex items-center gap-1.5">
                  <LinkIcon className="size-4 text-[#00C2FF]" />
                  Link Mời An Toàn (Secure Share Links)
                </h3>

                {/* Create Link Form */}
                <form onSubmit={handleCreateLink} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 bg-muted/20 border-2 border-border rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Quyền hạn</label>
                    <select
                      value={linkRole}
                      onChange={(e) => setLinkRole(e.target.value)}
                      className="w-full h-9 text-xs font-black uppercase rounded-lg border-2 border-border bg-white px-2 cursor-pointer"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="comment">Commenter</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Lượt dùng tối đa</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      className="h-9 border-2 border-border rounded-lg text-xs font-bold bg-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isCreatingLink}
                    className="h-9 rounded-lg bg-[#00C2FF] text-white uppercase font-black text-xs comic-shadow"
                  >
                    Tạo link mời mới
                  </Button>
                </form>

                {/* Active Links List */}
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-black uppercase text-muted-foreground">Link mời hoạt động (Tối đa 10)</div>
                  {!project?.shareLinks || project.shareLinks.filter(link => !link.isRevoked).length === 0 ? (
                    <div className="text-xs font-bold text-muted-foreground text-center py-4">Chưa tạo liên kết chia sẻ nào.</div>
                  ) : (
                    <div className="space-y-2">
                      {project.shareLinks
                        .filter((link) => !link.isRevoked)
                        .map((link) => {
                        const joinUrl = `${window.location.origin}/projects/join/${link.token}`;
                        const isCopied = copiedLinkId === link._id;
                        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                        
                        return (
                          <div
                            key={link._id}
                            className={`p-2.5 border-[2px] border-border rounded-xl bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs transition-colors ${
                              isExpired ? "opacity-60 bg-[#fff5f5]" : "hover:bg-muted/10"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Badge className="border border-border text-[8px] uppercase font-black px-1 py-px bg-[#dbf5ff] text-[#007ab3]">
                                  {link.role}
                                </Badge>
                                <span className="font-bold text-[10px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                                  {joinUrl}
                                </span>
                              </div>
                              <div className="text-[9px] font-bold text-muted-foreground mt-1 flex gap-3">
                                <span>Sử dụng: {link.usedCount} / {link.maxUses || "Vô hạn"}</span>
                                {link.expiresAt && (
                                  <span className={isExpired ? "text-destructive" : ""}>
                                    {isExpired ? "Hết hạn" : `Hết hạn: ${new Date(link.expiresAt).toLocaleDateString("vi-VN")}`}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                              <Button
                                type="button"
                                size="xs"
                                variant="secondary"
                                onClick={() => handleCopyText(joinUrl, "link", link._id)}
                                className="h-7 uppercase font-black text-[9px]"
                              >
                                {isCopied ? <CheckIcon className="size-3 text-[#7de228]" /> : <CopyIcon className="size-3" />}
                                Copy
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                onClick={() => handleRevokeLink(link._id)}
                                className="h-7 bg-[#ff3b57] text-white hover:bg-[#ff3b57]/90 uppercase font-black text-[9px]"
                              >
                                <Trash2Icon className="size-3" />
                                Hủy
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        <DialogFooter className="border-t border-border/10 p-6 mx-0 mb-0 flex gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#00c2ff] hover:bg-[#00afe6] text-foreground border-[3px] border-border rounded-xl uppercase font-black comic-shadow active:translate-y-0.5"
          >
            Hoàn tất
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
