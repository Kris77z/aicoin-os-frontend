'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { adminApi, userApi } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function PermissionsHome() {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; roles: { id: string; name: string }[] }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        userApi.getUsers({ take: 1000 }),
        adminApi.getRoles(),
      ]);
      const list = (usersRes.users?.users || []) as Array<{ id: string; name: string; email: string; roles: { id: string; name: string }[] }>;
      setUsers(list);
      setRoles((rolesRes.roles || []) as Array<{ id: string; name: string }>);
    } catch (e) {
      console.error(e);
      toast.error('加载数据失败');
    }
  };

  useEffect(() => { load(); }, []);

  const adminRoleNames = new Set(['super_admin','admin','hr_manager','project_manager']);
  const adminUsers = users.filter(u => (u.roles || []).some(r => adminRoleNames.has(r.name)));

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      const res = await adminApi.getUserPermissions(userId);
      const current = (res?.user?.roles || []).map((r: { name: string }) => r.name);
      setSelectedRoles(current);
    } catch {
      setSelectedRoles([]);
    }
  };

  const toggleRole = (name: string) => {
    setSelectedRoles(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const save = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await adminApi.setUserRoles(selectedUserId, selectedRoles);
      toast.success('已更新角色');
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('保存失败：' + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">权限管理</h2>

        <div className="flex items-center gap-3">
          <Select value={selectedUserId} onValueChange={handleSelectUser}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="选择人员以管理角色" />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}（{u.email}）</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!selectedUserId || saving} onClick={save}>{saving ? '保存中...' : '保存'}</Button>
        </div>

        {selectedUserId && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">勾选下列角色以赋予权限</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {roles.map(role => {
                const cnMap: Record<string, string> = {
                  'super_admin': '超级管理员',
                  'admin': '管理员',
                  'hr_manager': 'HR管理员',
                  'project_manager': '主管',
                  'member': '普通成员',
                }
                const displayName = cnMap[role.name] || role.name
                return (
                  <label key={role.id} className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={() => toggleRole(role.name)}
                    />
                    <span>{displayName}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-medium">管理员列表</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map(u => {
                const cnMap: Record<string, string> = {
                  'super_admin': '超级管理员',
                  'admin': '管理员',
                  'hr_manager': 'HR管理员',
                  'project_manager': '主管',
                  'member': '普通成员',
                }
                const roleNames = (u.roles || []).map(r => cnMap[r.name] || r.name).join('、')
                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roleNames}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}


