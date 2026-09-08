"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { USER_ROLES, type UserRole } from "@mios/shared";
import { useT } from "@/lib/i18n/useT";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Panel, PanelTitle, PanelDescription, Badge, ErrorBanner, Muted } from "@/components/ui/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { changeRole, inviteTeammate, setActive, type TeamMember } from "@/app/(app)/settings/team/actions";

export function TeamManager({
  members,
  currentUserId,
  currentRole,
}: {
  members: TeamMember[];
  currentUserId: string;
  currentRole: UserRole;
}) {
  const { t, lang } = useT();
  const canManage = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await inviteTeammate({ email, role });
      if (!result.ok) {
        setError(result.error === "forbidden" ? t.settings.team.ownerOnly : t.common.unknownError);
        return;
      }
      toast.success(t.settings.team.inviteSent(email));
      setEmail("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      {canManage ? (
        <Panel>
          <PanelTitle>{t.settings.team.invite}</PanelTitle>
          <PanelDescription className="mt-1">{t.settings.team.subtitle}</PanelDescription>

          <form onSubmit={onInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-email">{t.settings.team.inviteEmail}</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-role">{t.settings.team.inviteRole}</Label>
              <Select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                {USER_ROLES.filter((value) => value !== "owner" || isOwner).map((value) => (
                  <option key={value} value={value}>
                    {t.settings.team.roles[value]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={busy || !email.trim()}>
              <UserPlus className="size-4" />
              {busy ? t.common.pleaseWait : t.settings.team.sendInvite}
            </Button>
          </form>

          <Muted className="mt-2 text-xs">{t.settings.team.roleHints[role]}</Muted>
          <ErrorBanner className="mt-3">{error}</ErrorBanner>
        </Panel>
      ) : null}

      <Panel>
        <PanelTitle>{t.settings.team.members}</PanelTitle>
        <TableWrapper className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.settings.team.inviteEmail}</TableHead>
                <TableHead>{t.auth.yourName}</TableHead>
                <TableHead>{t.settings.team.inviteRole}</TableHead>
                <TableHead>{t.knowledge.status}</TableHead>
                <TableHead>{t.knowledge.uploaded}</TableHead>
                <TableHead className="text-right">{t.knowledge.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isSelf={member.id === currentUserId}
                  canManage={canManage}
                  canChangeRole={isOwner}
                  lang={lang}
                />
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
        {!canManage ? <Muted className="mt-3 text-xs">{t.settings.team.ownerOnly}</Muted> : null}
      </Panel>
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
  canManage,
  canChangeRole,
  lang,
}: {
  member: TeamMember;
  isSelf: boolean;
  canManage: boolean;
  canChangeRole: boolean;
  lang: "en" | "bn";
}) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function onRoleChange(next: UserRole) {
    setBusy(true);
    const result = await changeRole({ userId: member.id, role: next });
    if (!result.ok) toast.error(t.settings.team.ownerOnly);
    setBusy(false);
  }

  async function onToggleActive() {
    setBusy(true);
    const result = await setActive({ userId: member.id, isActive: !member.is_active });
    if (!result.ok) toast.error(t.common.forbidden);
    setBusy(false);
  }

  return (
    <TableRow>
      <TableCell className="max-w-[16rem] break-words">
        {member.email}
        {isSelf ? <span className="ml-1 text-xs text-muted">({t.settings.team.you})</span> : null}
      </TableCell>
      <TableCell className="text-muted">{member.full_name || "—"}</TableCell>
      <TableCell>
        {canChangeRole && !isSelf ? (
          <Select
            value={member.role}
            disabled={busy}
            aria-label={t.settings.team.changeRole}
            onChange={(event) => void onRoleChange(event.target.value as UserRole)}
            className="h-8 w-44 text-xs"
          >
            {USER_ROLES.map((value) => (
              <option key={value} value={value}>
                {t.settings.team.roles[value]}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-muted">{t.settings.team.roles[member.role]}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge tone={member.is_active ? "ok" : "neutral"}>
          {member.is_active ? t.common.yes : t.common.no}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted">
        {formatDate(member.created_at, lang)}
      </TableCell>
      <TableCell className="text-right">
        {canManage && !isSelf ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void onToggleActive()}>
            {member.is_active ? t.settings.team.deactivate : t.settings.team.reactivate}
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
